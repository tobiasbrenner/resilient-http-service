import { concatMap, delay, map, MonoTypeOperatorFunction, of, retry, Subject, take, tap } from 'rxjs';
import { IResilienceConfig, TTopicPropName } from '../../model/type/resilience.rx-operator.type';

export const getTopicSpecificBooleanOrDefault = (config: IResilienceConfig, propertyName: TTopicPropName): boolean => {
    const topicConfig = config.topicToConfigDict[config.topic];
    const isDefinedByTopicConfig = topicConfig && topicConfig[propertyName] !== undefined;

    return isDefinedByTopicConfig ? (topicConfig[propertyName] as boolean) : config[propertyName];
};

const isRetryDisabled = (config: IResilienceConfig): boolean =>
    getTopicSpecificBooleanOrDefault(config, 'disableRetry');

const waitForUserDecision = (config: IResilienceConfig): boolean =>
    getTopicSpecificBooleanOrDefault(config, 'waitForUserDecision');

export const shouldLogResult = (config: IResilienceConfig): boolean =>
    getTopicSpecificBooleanOrDefault(config, 'logResult');

export const shouldTrace = (config: IResilienceConfig): boolean => getTopicSpecificBooleanOrDefault(config, 'trace');

export const applyResilience = <T>(config: IResilienceConfig, uuid: string): MonoTypeOperatorFunction<T> => {
    const userRetryOrCancelSubject = new Subject<boolean>();
    let retryCount = 0;

    return retry<T>({
        delay: (error) =>
            of(error).pipe(
                concatMap((err) => {
                    if (isRetryDisabled(config) || !config.retryOnStatusCodeList.includes(err.status)) {
                        const topicSpecificMessageOrEmpty = config.topicToConfigDict[config.topic]?.onFailMessage || '';

                        config.onFail(config.topic, uuid, topicSpecificMessageOrEmpty);
                        throw err;
                    }
                    retryCount = retryCount + 1;
                    const retries = retryCount;

                    if (retryCount <= config.retryIntervalInMillisList.length) {
                        return of(err).pipe(
                            tap(() =>
                                config.onRequestRetry(
                                    config.topic,
                                    uuid,
                                    retries,
                                    config.retryIntervalInMillisList[retries - 1],
                                    err.status,
                                ),
                            ),
                            delay(config.retryIntervalInMillisList[retryCount - 1]),
                        );
                    } else {
                        retryCount = 0;

                        if (waitForUserDecision(config)) {
                            config.onWaitingForUserDecision(
                                config.topic,
                                uuid,
                                retries,
                                err.status,
                                userRetryOrCancelSubject,
                            );
                            return userRetryOrCancelSubject.asObservable().pipe(
                                take(1),
                                map((shouldRetry) => {
                                    if (shouldRetry) {
                                        config.onRequestRetry(
                                            config.topic,
                                            uuid,
                                            retries,
                                            config.retryIntervalInMillisList[retries - 1],
                                            err.status,
                                        );
                                        return of(err);
                                    }
                                    const topicSpecificMessageOrEmpty =
                                        config.topicToConfigDict[config.topic]?.onFailMessage || '';

                                    config.onFail(config.topic, uuid, topicSpecificMessageOrEmpty);
                                    throw err;
                                }),
                            );
                        } else {
                            const topicSpecificMessageOrEmpty =
                                config.topicToConfigDict[config.topic]?.onFailMessage || '';

                            config.onFail(config.topic, uuid, topicSpecificMessageOrEmpty);
                            throw err;
                        }
                    }
                }),
            ),
    });
};
