import { HttpStatusCode } from '@angular/common/http';
import { Subject } from 'rxjs';

export interface ITopicConfig {
    onFailMessage?: string;
    onFailResponse?: unknown;
    waitForUserDecision?: boolean;
    disableRetry?: boolean;
    logResult?: boolean;
    trace?: boolean;
}

export type TTopicPropName = 'waitForUserDecision' | 'disableRetry' | 'logResult' | 'trace';

export interface IResilienceConfig {
    topic: string;
    disableRetry: boolean;
    waitForUserDecision: boolean;
    retryOnStatusCodeList: number[];
    isDelayedAfterMs: number;
    retryIntervalInMillisList: number[];
    logResult: boolean;
    trace: boolean;
    topicToConfigDict: {
        [topicId: string]: ITopicConfig;
    };
    onFail(topic: string, uuid: string, message: string): void;
    onWaitingForUserDecision(
        topic: string,
        uuid: string,
        retryCount: number,
        failedOnStatusCode: HttpStatusCode,
        userRetryOrCancel: Subject<boolean>,
    ): void;
    onRequestDelayed(topic: string, uuid: string): void;
    onRequestRetry(
        topic: string,
        uuid: string,
        retryCount: number,
        nextRetry: number,
        failedOnHttpStatusCode: HttpStatusCode,
    ): void;
    onRequestStart(topic: string, uuid: string): void;
    onRequestFinalize(topic: string, uuid: string): void;
}
