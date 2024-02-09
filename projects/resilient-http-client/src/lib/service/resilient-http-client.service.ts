import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, finalize, map, Observable, of, take, tap, throwError, timer } from 'rxjs';
import { applyResilience, shouldLogResult, shouldTrace } from '../util/rx/resilience.rx-operator';
import { v4 as uuidv4 } from 'uuid';
import { THttpGetOption } from '../model/type/http-get-options.type';
import { IResilienceConfig } from '../model/type/resilience.rx-operator.type';
import { DEFAULT_RESILIENCE_CONFIG } from '../util/rx/resilience.rx-operator.config';

@Injectable({
    providedIn: 'root',
})
export class ResilientHttpClientService {
    constructor(private readonly httpClient: HttpClient) {}

    public get<T>(url: string, resilienceConfig: Partial<IResilienceConfig>, options?: THttpGetOption): Observable<T> {
        const finalConfig = {
            ...DEFAULT_RESILIENCE_CONFIG,
            ...resilienceConfig,
        } as IResilienceConfig;
        const uuid = uuidv4();
        const isDelayedSubscription = timer(finalConfig.isDelayedAfterMs)
            .pipe(take(1))
            .subscribe(() => {
                finalConfig.onRequestDelayed(finalConfig.topic, uuid);
            });
        const timeStart = Date.now();

        finalConfig.onRequestStart(finalConfig.topic, uuid);

        return this.httpClient
            .get<T>(url, {
                ...options,
                observe: 'response',
            })
            .pipe(
                applyResilience(finalConfig, uuid),
                map((res: HttpResponse<T>) => res.body as T),
                tap((res) => {
                    if (shouldLogResult(finalConfig)) {
                        // eslint-disable-next-line no-console
                        console.log(finalConfig.topic, res);
                    }
                }),
                catchError((err) => {
                    const topicRelatedConfig = finalConfig.topicToConfigDict[finalConfig.topic];

                    if (topicRelatedConfig) {
                        if (topicRelatedConfig.failoverResponse) {
                            return of(topicRelatedConfig.failoverResponse as T);
                        }
                    }
                    return throwError(() => err);
                }),
                finalize(() => {
                    if (shouldTrace(finalConfig)) {
                        const timeEnd = Date.now();
                        // eslint-disable-next-line no-console
                        console.log(
                            `Fetch time in ms of call-topic ${finalConfig.topic}:`,
                            finalConfig.topic,
                            uuid,
                            timeEnd - timeStart,
                        );
                    }
                    finalConfig.onRequestFinalize(finalConfig.topic, uuid);
                    isDelayedSubscription.unsubscribe();
                }),
            );
    }
}
