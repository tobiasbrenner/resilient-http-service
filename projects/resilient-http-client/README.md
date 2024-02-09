# Resilience Client

This is an augmented [Angular HttpClient][angular-http-client] which overrides the get method to enrich resilience
behaviour.

## Preconditions
Install it via ```yarn add resilient-http-client```

## Docs

### Default configuration
The [default config][default-config] is the following:

```TypeScript
export const DEFAULT_RESILIENCE_CONFIG: Partial<IResilienceConfig> = {
    /* the ms after which a request is reported via call
        to onRequestDelayed fn that it is delayed*/
    isDelayedAfterMs: 3000,
    /* flag to enable/disable the whole resilience behaviour */
    disableRetry: false,
    /* flag to enable/disable automatic log output for the response payload */
    logResult: false,
    /* flag to enable/disable automatic trace of request execution time */
    trace: false,
    /* flag to enable/disable 'wait on error' behaviour.
        If enabled, onWaitingForUserDecision fn will be called in case the retry loop failed.
        The user can restart the loop or cancel the request be sending a boolean flag to the
        userRetryOrCancel subject */
    waitForUserDecision: false,
    /* Default list of status codes for which a retry will be done.
        All other error status codes will cause an exception and cause the stream to close.
        No resilience behaviour will be added, except eventing (onFail, onRequestStart, onRequestFinalze)
        and, if configured via topicToConfigDict, a fallback response will be returned. */
    retryOnStatusCodeList: [
        HttpStatusCode.RequestTimeout,
        HttpStatusCode.Locked,
        HttpStatusCode.TooManyRequests,
        HttpStatusCode.InternalServerError,
        HttpStatusCode.BadGateway,
        HttpStatusCode.ServiceUnavailable,
        HttpStatusCode.GatewayTimeout,
    ],
    /* Default retry interval list in milliseconds. This list means: if the initial request fails and
        it was a status code from the retryOnStatusCodeList list, retry immediately, then after waiting for
        200 if it still failed, and then after additional 500 again, etc. until there is no more ms in the array.
        The retry loop will stop after looping through the retryIntervalInMillisList array.
        If waitForUserDecision was false, it will then throw an expection and close the stream.
        In this case, if configured via topicToConfigDict, a fallback response will be returned or it will just throw.
    */
    retryIntervalInMillisList: [0, 200, 500, 1000, 1000],
    /* The possibility to:
        - override boolean flags (waitForUserDecision, disableRetry, logResult, trace) and
        - hook up specific event listeners for onFailMessage and onFailResponse
        for a specific topic. Recommendation is to use a string enum for all topics in your app. */
    topicToConfigDict: {},
    /* Event listener callback for onWaitingForUserDecision event. Will be called if retry loop failed
        and waitForUserDecision flag was true globally or for the regarding topic, configured
        via topicToConfigDict. */ 
    onWaitingForUserDecision: (
        // the topic of the request, typically the name of the API fn or its intent
        topic: string,
        /* unique id for the current request. Will be the same for each event callback invocation
           for the regarding request. */
        uuid: string, 
        retryCount: number, // how many times did the resilience pattern tried to retry the failed request
        failedOnStatusCode: HttpStatusCode, // the HttpStatusCode of the last failed request 
        userRetryOrCancel: Subject<boolean>, // subject to cause retry loop to start again (true) or cancel the request (false)
    ): void => {},
    onFail: (topic: string, uuid: string, message: string): void => {},
    onRequestDelayed: (topic: string, uuid: string): void => {},
    onRequestRetry: (
        topic: string,
        uuid: string,
        retryCount: number,
        nextRetry: number, // next retry will be done in x ms
        failedOnHttpStatusCode: HttpStatusCode,
    ): void => {},
    onRequestStart: (topic: string, uuid: string): void => {},
    onRequestFinalize: (topic: string, uuid: string): void => {},
};
```

### Recommended: use a builder for topic specific resilience config enrichment
```TypeScript
// RESILIENT_API_TOPIC = string enum with all resilience topics of your app
export const buildResilienceConfigForTopic = (topic: RESILIENT_API_TOPIC): IResilienceConfig => {
    return {
        ...DEFAULT_RESILIENCE_CONFIG, // the default resilience config from this library
        ...RESILIENCE_CONFIG, // a reference to your global resilience config, typically located in ./src/app/config/resilience.config.ts
        topic, // add the topic flag
    } as IResilienceConfig;
};
```

## Demo usage:
```TypeScript
@Injectable({
providedIn: 'root',
})
export class SampleApiService {

    constructor(
        private readonly resilientHttpClientService: ResilientHttpClientService,
    ) {
    }

    public getYourDtoList$(bySomeId: ISampleId): Observable<ISampleDto[]> {
        /* everything as like the normal use of Angular HttpClient, just enriched by a topic unspecific (global) or
           topic specific resilient config which specifies the wanted failover behaviour */
        return this.resilientHttpClientService
            .get<
                ISampleDto[]
            >('/some/url/to/the/dto/api', buildResilienceConfigForTopic(RESILIENT_API_TOPIC.SAMPLE_DTO_LIST));
    }
}
```

### The code documentation
Take a look at the code documentation by opening the index.html file.
- Folder: <code>/doc/code</code>

### Test coverage report
Take a look at the test coverage by opening the index.html file.
- Folder: <code>/doc/test</code>

**Love the Resilience Client? Give our repo a star :star: :arrow_up:.**

[default-config]: ./projects/resilient-http-client/src/lib/util/rx/resilience.rx-operator.config.ts
[angular-http-client]: https://angular.io/api/common/http/HttpClient
