import { IResilienceConfig } from '../../model/type/resilience.rx-operator.type';
import { HttpStatusCode } from '@angular/common/http';

export const DEFAULT_RESILIENCE_CONFIG: Partial<IResilienceConfig> = {
    isDelayedAfterMs: 5000,
    disableRetry: false,
    logResult: false,
    trace: false,
    waitForUserDecision: false,
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
    topicToConfigDict: {},
    onWaitingForUserDecision: (): void => {},
    onFail: (): void => {},
    onRequestDelayed: (): void => {},
    onRequestRetry: (): void => {},
    onRequestStart: (): void => {},
    onRequestFinalize: (): void => {},
};
