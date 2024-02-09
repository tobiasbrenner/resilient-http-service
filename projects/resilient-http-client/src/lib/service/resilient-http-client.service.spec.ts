import { ResilientHttpClientService } from './resilient-http-client.service';
import { HttpClientMock } from '../mock/httpclient.mock';
import { HttpClient, HttpStatusCode } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { IResilienceConfig } from '../model/type/resilience.rx-operator.type';
import { DEFAULT_RESILIENCE_CONFIG } from '../util/rx/resilience.rx-operator.config';

describe('A ResilientHttpClientService', () => {
    const DELAYED_AFTER_MS = 5000;
    const TEST_URL = '/some/path';
    let instance: ResilientHttpClientService;
    let httpClientMock: HttpClientMock;
    let baseConfig: Partial<IResilienceConfig>;
    let subscription: Subscription;
    let successSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;
    let onDelayedRequestSpy: jest.SpyInstance;
    let onRetryRequestSpy: jest.SpyInstance;
    let onWaitingForUserDecisionSpy: jest.SpyInstance;
    let onFailSpy: jest.SpyInstance;
    let onRequestStartSpy: jest.SpyInstance;
    let onFinalizeSpy: jest.SpyInstance;
    let callback: {
        next(success: unknown): void;
        error(err: unknown): void;
    };
    let debugSpy: jest.SpyInstance;

    beforeEach(() => {
        httpClientMock = new HttpClientMock();
        instance = new ResilientHttpClientService(httpClientMock as unknown as HttpClient);
        baseConfig = {
            topic: 'JEST_JUNIT_TEST',
            onRequestDelayed: jest.fn(),
            onRequestRetry: jest.fn(),
            onRequestStart: jest.fn(),
            onRequestFinalize: jest.fn(),
            onFail: jest.fn(),
            onWaitingForUserDecision: jest.fn(),
            trace: true,
            logResult: true,
            isDelayedAfterMs: DELAYED_AFTER_MS,
        };
        callback = {
            next: jest.fn(),
            error: jest.fn(),
        };
        successSpy = jest.spyOn(callback, 'next');
        errorSpy = jest.spyOn(callback, 'error');
        onDelayedRequestSpy = jest.spyOn(baseConfig, 'onRequestDelayed');
        onRetryRequestSpy = jest.spyOn(baseConfig, 'onRequestRetry');
        onWaitingForUserDecisionSpy = jest.spyOn(baseConfig, 'onWaitingForUserDecision');
        onFailSpy = jest.spyOn(baseConfig, 'onFail');
        onRequestStartSpy = jest.spyOn(baseConfig, 'onRequestStart');
        onFinalizeSpy = jest.spyOn(baseConfig, 'onRequestFinalize');
        debugSpy = jest.spyOn(console, 'log');
        jest.useFakeTimers();
    });

    afterEach(() => {
        subscription.unsubscribe();
        jest.runOnlyPendingTimers();
        jest.clearAllTimers();
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    describe('delayed request behaviour', () => {
        beforeEach(() => {
            httpClientMock.setNextDelay(DELAYED_AFTER_MS + 1000);
            httpClientMock.setNextResult({
                status: HttpStatusCode.Ok,
                body: {
                    some: 'delayed content',
                },
            });
            subscription = instance.get(TEST_URL, baseConfig).subscribe(callback);
            jest.advanceTimersByTime(DELAYED_AFTER_MS + 10);
        });

        it('should emit a delayed request event if request duration exceeds specified amount of ms', () => {
            expect(onDelayedRequestSpy).toHaveBeenCalledTimes(1);
            expect(successSpy).not.toHaveBeenCalled();
            expect(errorSpy).not.toHaveBeenCalled();
        });

        it('should emit the topic and uuid of the delayed request', () => {
            expect(onDelayedRequestSpy.mock.calls[0][0]).toEqual(baseConfig.topic);
            expect(onDelayedRequestSpy.mock.calls[0][1]).not.toEqual('');
        });
    });

    describe('trace behaviour', () => {
        it('should log the total fetch time', () => {
            baseConfig.logResult = false;
            httpClientMock.setNextDelay(5000);
            httpClientMock.setNextResult({
                status: HttpStatusCode.Ok,
                body: {
                    some: 'delayed content',
                },
            });
            subscription = instance.get(TEST_URL, baseConfig).subscribe(callback);
            jest.advanceTimersByTime(6000);
            expect(debugSpy).toHaveBeenCalled();
            expect(debugSpy.mock.calls[0][1]).toEqual(baseConfig.topic);
            expect(debugSpy.mock.calls[0][3] >= 5000).toBeTruthy();
        });

        it('should not log the total fetch time if the trace was disabled', () => {
            baseConfig.logResult = false;
            baseConfig.trace = false;
            httpClientMock.setNextDelay(5000);
            httpClientMock.setNextResult({
                status: HttpStatusCode.Ok,
                body: {
                    some: 'delayed content',
                },
            });
            subscription = instance.get(TEST_URL, baseConfig).subscribe(callback);
            jest.advanceTimersByTime(6000);
            expect(debugSpy).not.toHaveBeenCalled();
        });
    });

    describe('map to request body behaviour', () => {
        it('should return the unwrapped message body', () => {
            const CONTENT = {
                some: 'content',
            };

            httpClientMock.setNextResult({
                status: HttpStatusCode.Ok,
                body: CONTENT,
            });
            subscription = instance.get(TEST_URL, baseConfig).subscribe(callback);
            jest.runOnlyPendingTimers();
            expect(successSpy).toHaveBeenCalledWith(CONTENT);
        });
    });

    describe('logResult behaviour', () => {
        it('should log the received content', () => {
            const CONTENT = {
                some: 'content',
            };

            httpClientMock.setNextResult({
                status: HttpStatusCode.Ok,
                body: CONTENT,
            });
            subscription = instance.get(TEST_URL, baseConfig).subscribe(callback);
            jest.runOnlyPendingTimers();
            expect(debugSpy).toHaveBeenCalledWith(baseConfig.topic, CONTENT);
        });

        it('should not log the received content if it was disabled', () => {
            const CONTENT = {
                some: 'content',
            };

            httpClientMock.setNextResult({
                status: HttpStatusCode.Ok,
                body: CONTENT,
            });
            baseConfig.trace = false;
            baseConfig.logResult = false;
            subscription = instance.get(TEST_URL, baseConfig).subscribe(callback);
            jest.runOnlyPendingTimers();
            expect(debugSpy).not.toHaveBeenCalled();
        });
    });

    describe('onRequestStart behaviour', () => {
        it('should emit a request start event', () => {
            httpClientMock.setNextResult({
                status: HttpStatusCode.Ok,
                body: { some: 'value' },
            });
            subscription = instance.get(TEST_URL, baseConfig).subscribe(callback);
            jest.runOnlyPendingTimers();
            expect(onRequestStartSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('onRequestFinalize behaviour', () => {
        it('should emit an onRequestFinalize event after success', () => {
            httpClientMock.setNextResult({
                status: HttpStatusCode.Ok,
                body: { some: 'value' },
            });
            subscription = instance.get(TEST_URL, baseConfig).subscribe(callback);
            jest.runOnlyPendingTimers();
            expect(onFinalizeSpy).toHaveBeenCalledTimes(1);
        });

        it('should emit an onRequestFinalize event after error', () => {
            httpClientMock.setFailOnNextRequest({
                status: HttpStatusCode.Unauthorized,
            });
            subscription = instance.get(TEST_URL, baseConfig).subscribe(callback);
            jest.runOnlyPendingTimers();
            expect(onFinalizeSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('failover behaviour', () => {
        it('should return replacement result on error', () => {
            const FAIL_OVER_RESULT = { some: 'replacement' };

            baseConfig.topicToConfigDict = {
                JEST_JUNIT_TEST: {
                    onFailResponse: FAIL_OVER_RESULT,
                },
            };
            httpClientMock.setFailOnNextRequest({
                status: HttpStatusCode.Unauthorized,
            });
            subscription = instance.get(TEST_URL, baseConfig).subscribe(callback);
            jest.runOnlyPendingTimers();
            expect(successSpy).toHaveBeenCalledWith(FAIL_OVER_RESULT);
            expect(errorSpy).not.toHaveBeenCalled();
        });

        it('should rethrow the error if no failover result was configured', () => {
            httpClientMock.setFailOnNextRequest({
                status: HttpStatusCode.Unauthorized,
            });
            subscription = instance.get(TEST_URL, baseConfig).subscribe(callback);
            jest.runOnlyPendingTimers();
            expect(errorSpy).toHaveBeenCalled();
        });

        it('should emit onFail event with customized message', () => {
            const CUSTOM_ON_FAIL_MSG = 'Custom message';

            baseConfig.topicToConfigDict = {
                JEST_JUNIT_TEST: {
                    onFailMessage: CUSTOM_ON_FAIL_MSG,
                },
            };
            httpClientMock.setFailOnNextRequest({
                status: HttpStatusCode.Unauthorized,
            });
            subscription = instance.get(TEST_URL, baseConfig).subscribe(callback);
            jest.runOnlyPendingTimers();
            expect(onFailSpy.mock.calls[0][0]).toEqual(baseConfig.topic);
            expect(onFailSpy.mock.calls[0][2]).toEqual(CUSTOM_ON_FAIL_MSG);
        });

        it('should default the custom onFail message to empty string', () => {
            httpClientMock.setFailOnNextRequest({
                status: HttpStatusCode.Unauthorized,
            });
            subscription = instance.get(TEST_URL, baseConfig).subscribe(callback);
            jest.runOnlyPendingTimers();
            expect(onFailSpy.mock.calls[0][0]).toEqual(baseConfig.topic);
            expect(onFailSpy.mock.calls[0][2]).toEqual('');
        });
    });

    describe('resilience retry behaviour', () => {
        it('should not retry a request which is not specified as retryable', () => {
            httpClientMock.setFailOnNextRequest({
                status: HttpStatusCode.Unauthorized,
            });
            subscription = instance.get(TEST_URL, baseConfig).subscribe(callback);
            jest.advanceTimersByTime(5000);
            expect(onRetryRequestSpy).not.toHaveBeenCalled();
            expect(errorSpy).toHaveBeenCalled();
        });

        it('should retry a failed request according to config', () => {
            httpClientMock.setFailOnNextRequestList([
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
            ]);
            subscription = instance.get(TEST_URL, baseConfig).subscribe(callback);
            jest.advanceTimersByTime(DEFAULT_RESILIENCE_CONFIG.retryIntervalInMillisList![0] + 10);
            // changed behaviour of onRequestRetry logic. Event will be triggered before retry call and will inform about when the next call will be done
            expect(onRetryRequestSpy).toHaveBeenCalledTimes(2);
            jest.advanceTimersByTime(DEFAULT_RESILIENCE_CONFIG.retryIntervalInMillisList![1] + 10);
            expect(onRetryRequestSpy).toHaveBeenCalledTimes(3);
            jest.advanceTimersByTime(DEFAULT_RESILIENCE_CONFIG.retryIntervalInMillisList![2] + 10);
            expect(onRetryRequestSpy).toHaveBeenCalledTimes(4);
            jest.advanceTimersByTime(DEFAULT_RESILIENCE_CONFIG.retryIntervalInMillisList![3] + 10);
            expect(onRetryRequestSpy).toHaveBeenCalledTimes(5);
            jest.advanceTimersByTime(DEFAULT_RESILIENCE_CONFIG.retryIntervalInMillisList![4] + 10);
            // no next retry call, so counter stays at 5
            expect(onRetryRequestSpy).toHaveBeenCalledTimes(5);
            expect(errorSpy).toHaveBeenCalled();
        });

        it('should fail after retry phase if waitForUserDecision was false', () => {
            httpClientMock.setFailOnNextRequestList([
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
            ]);
            subscription = instance.get(TEST_URL, baseConfig).subscribe(callback);
            jest.advanceTimersByTime(40000);
            expect(errorSpy).toHaveBeenCalled();
        });

        it('should emit a WaitingForUserDecision event if the retry failed', () => {
            baseConfig.waitForUserDecision = true;
            httpClientMock.setFailOnNextRequestList([
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
            ]);
            subscription = instance.get(TEST_URL, baseConfig).subscribe(callback);
            jest.advanceTimersByTime(40000);
            expect(onWaitingForUserDecisionSpy).toHaveBeenCalledTimes(1);
        });

        it('should not emit WaitingForUserDecision event if the retry failed and the config disabled the waiting', () => {
            httpClientMock.setFailOnNextRequestList([
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
            ]);
            subscription = instance.get(TEST_URL, baseConfig).subscribe(callback);
            jest.advanceTimersByTime(40000);
            expect(onWaitingForUserDecisionSpy).not.toHaveBeenCalled();
        });

        it('should restart the retry loop on user trigger', () => {
            baseConfig.waitForUserDecision = true;
            httpClientMock.setFailOnNextRequestList([
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
            ]);
            subscription = instance.get(TEST_URL, baseConfig).subscribe(callback);
            jest.advanceTimersByTime(40000);
            expect(onWaitingForUserDecisionSpy).toHaveBeenCalled();

            httpClientMock.setFailOnNextRequestList([
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
            ]);
            onWaitingForUserDecisionSpy.mock.calls[0][4].next(true); // call the retry callback with shouldRetry = true
            jest.advanceTimersByTime(40000);
            expect(onRetryRequestSpy).toHaveBeenCalledTimes(11);
            expect(onWaitingForUserDecisionSpy).toHaveBeenCalledTimes(2);
        });

        it('should fail on user retry decision', () => {
            baseConfig.waitForUserDecision = true;
            httpClientMock.setFailOnNextRequestList([
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
                { status: HttpStatusCode.RequestTimeout },
            ]);
            subscription = instance.get(TEST_URL, baseConfig).subscribe(callback);
            jest.advanceTimersByTime(40000);
            onWaitingForUserDecisionSpy.mock.calls[0][4].next(false); // call the retry callback with shouldRetry = false
            jest.advanceTimersByTime(40000);
            expect(onRetryRequestSpy).toHaveBeenCalledTimes(5);
            expect(onWaitingForUserDecisionSpy).toHaveBeenCalledTimes(1);
            expect(onFailSpy).toHaveBeenCalled();
        });
    });
});
