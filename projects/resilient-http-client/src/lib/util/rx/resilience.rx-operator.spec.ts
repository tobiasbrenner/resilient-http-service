import { interval, map, Observable, Subject, Subscription, takeUntil, tap } from 'rxjs';
import { HttpStatusCode } from '@angular/common/http';
import {
    applyResilience,
    getTopicSpecificBooleanOrDefault,
    shouldLogResult,
    shouldTrace,
} from './resilience.rx-operator';
import { v4 as uuidv4 } from 'uuid';
import { IResilienceConfig } from '../../model/type/resilience.rx-operator.type';
import { DEFAULT_RESILIENCE_CONFIG } from './resilience.rx-operator.config';

describe('An applyResilience operator', () => {
    let uuid: string;
    let resilienceConfig: IResilienceConfig;
    let callback: {
        next(success: unknown): void;
        error(err: unknown): void;
    };
    let sourceObservable$: Observable<unknown>;
    let subscription: Subscription;
    let successSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;
    let onDelayedRequestSpy: jest.SpyInstance;
    let onRetryRequestSpy: jest.SpyInstance;
    let onWaitingForUserDecisionSpy: jest.SpyInstance;
    let onFailSpy: jest.SpyInstance;
    let onFinalizeSpy: jest.SpyInstance;
    let destroySub: Subject<void>;

    beforeEach(() => {
        uuid = uuidv4();
        resilienceConfig = {
            isDelayedAfterMs: 5000,
            disableRetry: false,
            logResult: false,
            trace: false,
            waitForUserDecision: false,
            topic: 'TEST',
            topicToConfigDict: {},
            retryOnStatusCodeList: [
                HttpStatusCode.RequestTimeout,
                HttpStatusCode.Locked,
                HttpStatusCode.TooManyRequests,
                HttpStatusCode.InternalServerError,
                HttpStatusCode.BadGateway,
                HttpStatusCode.ServiceUnavailable,
                HttpStatusCode.GatewayTimeout,
            ],
            retryIntervalInMillisList: [0, 500, 1000, 10000, 20000],
            onRequestDelayed: jest.fn() as (topic: string, uuid: string) => void,
            onRequestRetry: jest.fn() as (
                topic: string,
                uuid: string,
                retryCount: number,
                nextRetry: number,
                failedOnHttpStatusCode: HttpStatusCode,
            ) => void,
            onWaitingForUserDecision: jest.fn() as (
                topic: string,
                uuid: string,
                retryCount: number,
                failedOnStatusCode: HttpStatusCode,
                userRetryOrCancel: Subject<boolean>,
            ) => void,
            onFail: jest.fn() as (topic: string, uuid: string, message: string) => void,
            onRequestStart: jest.fn() as (topic: string, uuid: string) => void,
            onRequestFinalize: jest.fn() as (topic: string, uuid: string) => void,
        };

        jest.useFakeTimers();
        let resultCount = 0;

        callback = {
            next: jest.fn(),
            error: jest.fn(),
        };
        successSpy = jest.spyOn(callback, 'next');
        errorSpy = jest.spyOn(callback, 'error');
        onDelayedRequestSpy = jest.spyOn(resilienceConfig, 'onRequestDelayed');
        onRetryRequestSpy = jest.spyOn(resilienceConfig, 'onRequestRetry');
        onWaitingForUserDecisionSpy = jest.spyOn(resilienceConfig, 'onWaitingForUserDecision');
        onFailSpy = jest.spyOn(resilienceConfig, 'onFail');
        onFinalizeSpy = jest.spyOn(resilienceConfig, 'onRequestFinalize');
        destroySub = new Subject<void>();
        sourceObservable$ = interval(100).pipe(
            takeUntil(destroySub),
            tap(() => {
                resultCount += 1;
                if (resultCount !== 20) {
                    // eslint-disable-next-line no-throw-literal
                    throw {
                        status: HttpStatusCode.GatewayTimeout,
                        errorCount: resultCount,
                    };
                }
            }),
            map(() => ({
                some: 'validData',
            })),
            applyResilience(resilienceConfig, uuid),
        );
    });

    afterEach(() => {
        destroySub.next();
        if (subscription) {
            subscription.unsubscribe();
        }
        jest.useRealTimers();
    });

    describe('events', () => {
        it('should only emit onFail event if disableRetry flag was true and stream caused an error', () => {
            resilienceConfig.disableRetry = true;
            subscription = sourceObservable$.subscribe(callback);
            jest.advanceTimersByTime(5000);
            expect(onDelayedRequestSpy).not.toHaveBeenCalled();
            expect(onRetryRequestSpy).not.toHaveBeenCalled();
            expect(onWaitingForUserDecisionSpy).not.toHaveBeenCalled();
            expect(onFailSpy).toHaveBeenCalled();
            expect(onFinalizeSpy).not.toHaveBeenCalled();
        });

        it('should call onRetryRequest after retryIntervalInMillisList passed and the call will be retried', () => {
            subscription = sourceObservable$.subscribe(callback);
            expect(onRetryRequestSpy).not.toHaveBeenCalled();
            jest.advanceTimersByTime(DEFAULT_RESILIENCE_CONFIG.retryIntervalInMillisList![0] + 10);
            expect(onRetryRequestSpy).toHaveBeenCalledTimes(1);
            expect(onRetryRequestSpy).toHaveBeenCalledWith(
                resilienceConfig.topic,
                uuid,
                1,
                resilienceConfig.retryIntervalInMillisList[0],
                HttpStatusCode.GatewayTimeout,
            );
            jest.advanceTimersByTime(DEFAULT_RESILIENCE_CONFIG.retryIntervalInMillisList![1] + 10);
            expect(onRetryRequestSpy).toHaveBeenCalledTimes(2);
            expect(onRetryRequestSpy).toHaveBeenCalledWith(
                resilienceConfig.topic,
                uuid,
                2,
                resilienceConfig.retryIntervalInMillisList[1],
                HttpStatusCode.GatewayTimeout,
            );
        });

        it('should wait for user decision event before restarting with new retries', () => {
            resilienceConfig.waitForUserDecision = true;
            subscription = sourceObservable$.subscribe(callback);
            jest.advanceTimersByTime(32500); // sum of all retry millis + 1000
            expect(onRetryRequestSpy).toHaveBeenCalledTimes(5);
            expect(onWaitingForUserDecisionSpy).toHaveBeenCalledTimes(1);
            jest.advanceTimersByTime(100000); // check waiting state
            expect(onRetryRequestSpy).toHaveBeenCalledTimes(5); // still 5 and waiting?
            onWaitingForUserDecisionSpy.mock.calls[0][4].next(true); // emit retry wish
            jest.advanceTimersByTime(100);
            expect(onRetryRequestSpy).toHaveBeenCalledTimes(6);
        });

        it('should fail after user decision was to cancel the stream', () => {
            resilienceConfig.waitForUserDecision = true;
            subscription = sourceObservable$.subscribe(callback);
            jest.advanceTimersByTime(32500); // sum of all retry millis + 1000
            expect(onRetryRequestSpy).toHaveBeenCalledTimes(5);
            expect(onWaitingForUserDecisionSpy).toHaveBeenCalledTimes(1);
            onWaitingForUserDecisionSpy.mock.calls[0][4].next(false); // emit cancel wish
            expect(onFailSpy).toHaveBeenCalledTimes(1);
        });

        it('should fail with custom error message after user decision was to cancel the stream if a topic config was given', () => {
            resilienceConfig.waitForUserDecision = true;
            resilienceConfig.topicToConfigDict = {
                TEST: {
                    onFailMessage: 'custom fail message',
                },
            };
            subscription = sourceObservable$.subscribe(callback);
            jest.advanceTimersByTime(32500); // sum of all retry millis + 1000
            expect(onRetryRequestSpy).toHaveBeenCalledTimes(5);
            expect(onWaitingForUserDecisionSpy).toHaveBeenCalledTimes(1);
            onWaitingForUserDecisionSpy.mock.calls[0][4].next(false); // emit cancel wish
            expect(onFailSpy).toHaveBeenCalledWith(resilienceConfig.topic, uuid, 'custom fail message');
            expect(errorSpy).toHaveBeenCalledWith({
                status: HttpStatusCode.GatewayTimeout,
                errorCount: 6,
            });
        });

        it('should call onFail if it retried as much as specified and failed and waitForUserDecision was false', () => {
            subscription = sourceObservable$.subscribe(callback);
            jest.advanceTimersByTime(32500); // sum of all retry millis + 1000
            expect(onFailSpy).toHaveBeenCalledTimes(1);
            expect(errorSpy).toHaveBeenCalledWith({
                status: HttpStatusCode.GatewayTimeout,
                errorCount: 6,
            });
        });

        it('should call onFail with custom message if it retried as much as specified and failed and waitForUserDecision was false', () => {
            resilienceConfig.topicToConfigDict = {
                TEST: {
                    onFailMessage: 'custom fail message',
                },
            };
            subscription = sourceObservable$.subscribe(callback);
            jest.advanceTimersByTime(32500); // sum of all retry millis + 1000
            expect(onFailSpy).toHaveBeenCalledTimes(1);
            expect(onFailSpy).toHaveBeenCalledWith(resilienceConfig.topic, uuid, 'custom fail message');
            expect(errorSpy).toHaveBeenCalledWith({
                status: HttpStatusCode.GatewayTimeout,
                errorCount: 6,
            });
        });
    });

    it('should throw an error if disableRetry flag was true and the observable had an error', () => {
        resilienceConfig.disableRetry = true;
        subscription = sourceObservable$.subscribe(callback);
        jest.advanceTimersByTime(5000);
        expect(successSpy).not.toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledWith({
            status: HttpStatusCode.GatewayTimeout,
            errorCount: 1,
        });
    });

    it('should throw error if error status is a not within retry list', () => {
        destroySub.next();
        if (subscription) {
            subscription.unsubscribe();
        }
        onFailSpy.mockClear();
        sourceObservable$ = interval(100).pipe(
            takeUntil(destroySub),
            tap(() => {
                // eslint-disable-next-line no-throw-literal
                throw {
                    status: 42,
                };
            }),
            applyResilience(resilienceConfig, uuid),
        );
        subscription = sourceObservable$.subscribe(callback);
        jest.advanceTimersByTime(100);
        expect(onRetryRequestSpy).not.toHaveBeenCalled();
        expect(onFailSpy).toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalled();
    });

    describe('getTopicSpecificBooleanOrDefault behaviour', () => {
        const topicConfig = {
            onFailMessage: '',
            waitForUserDecision: true,
            disableRetry: true,
            logResult: true,
            trace: true,
        };

        it.each`
            propertyName             | config         | expectedResult
            ${'waitForUserDecision'} | ${undefined}   | ${false}
            ${'disableRetry'}        | ${undefined}   | ${false}
            ${'logResult'}           | ${undefined}   | ${false}
            ${'trace'}               | ${undefined}   | ${false}
            ${'waitForUserDecision'} | ${topicConfig} | ${true}
            ${'disableRetry'}        | ${topicConfig} | ${true}
            ${'logResult'}           | ${topicConfig} | ${true}
            ${'trace'}               | ${topicConfig} | ${true}
        `(
            'should return the default boolean if no topic specific override config was provided and the override if provided',
            ({ propertyName, config, expectedResult }) => {
                if (config) {
                    resilienceConfig.topicToConfigDict = {
                        TEST: config,
                    };
                }
                expect(getTopicSpecificBooleanOrDefault(resilienceConfig, propertyName)).toEqual(expectedResult);
            },
        );
    });

    describe('shouldLogResult behaviour', () => {
        it('should return default', () => {
            expect(shouldLogResult(resilienceConfig)).toBeFalsy();
        });

        it('should return the override specified by topic config', () => {
            resilienceConfig.topicToConfigDict = {
                TEST: {
                    onFailMessage: '',
                    waitForUserDecision: true,
                    disableRetry: true,
                    logResult: true,
                    trace: true,
                },
            };
            expect(shouldLogResult(resilienceConfig)).toBeTruthy();
        });
    });

    describe('shouldTrace behaviour', () => {
        it('should return default', () => {
            expect(shouldTrace(resilienceConfig)).toBeFalsy();
        });

        it('should return the override specified by topic config', () => {
            resilienceConfig.topicToConfigDict = {
                TEST: {
                    onFailMessage: '',
                    waitForUserDecision: true,
                    disableRetry: true,
                    logResult: true,
                    trace: true,
                },
            };
            expect(shouldTrace(resilienceConfig)).toBeTruthy();
        });
    });

    describe('shouldLogResult behaviour', () => {
        it('should return default', () => {
            expect(shouldLogResult(resilienceConfig)).toBeFalsy();
        });

        it('should return the override specified by topic config', () => {
            resilienceConfig.topicToConfigDict = {
                TEST: {
                    onFailMessage: '',
                    waitForUserDecision: true,
                    disableRetry: true,
                    logResult: true,
                    trace: true,
                },
            };
            expect(shouldLogResult(resilienceConfig)).toBeTruthy();
        });
    });
});
