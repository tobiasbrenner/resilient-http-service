import { delay, Observable, of, throwError } from 'rxjs';
import { HttpContext, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';

export class HttpClientMock {
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    private nextResultList: any[];
    private nextDelayList: number[];
    private failOnNextGetRequestList: Array<{
        // eslint-disable-next-line  @typescript-eslint/no-explicit-any
        error?: any;
        headers?: HttpHeaders;
        status?: number;
        statusText?: string;
        url?: string;
    }>;

    public getSpy: jest.SpyInstance;

    constructor() {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.getSpy = jest.spyOn(this, 'get');
        this.nextResultList = [];
        this.nextDelayList = [];
        this.failOnNextGetRequestList = [];
    }

    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    public setNextResult(result: any): void {
        this.nextResultList = [result];
    }

    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    public setNextResultList(resultList: any[]): void {
        this.nextResultList = resultList;
    }

    public setNextDelayList(delayList: number[]): void {
        this.nextDelayList = delayList;
    }

    public setNextDelay(delayInMs: number, append: boolean = false): void {
        this.nextDelayList = append ? [...this.nextDelayList, delayInMs] : [delayInMs];
    }

    public clearResultList(): void {
        this.nextResultList = [];
    }

    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    public pushNextResult(result: any): void {
        this.nextResultList.push(result);
    }

    public get<T>(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        url,
        options?: {
            headers?:
                | HttpHeaders
                | {
                      [header: string]: string | string[];
                  };
            context?: HttpContext;
            observe?: 'body';
            params?:
                | HttpParams
                | {
                      [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean>;
                  };
            reportProgress?: boolean;
            responseType?: 'json';
            withCredentials?: boolean;
        },
    ): Observable<T> {
        const failWithResult = this.failOnNextGetRequestList.shift();

        if (failWithResult) {
            return throwError(() => new HttpErrorResponse(failWithResult));
        }

        if (!this.nextResultList.length) {
            throw new Error('HttpClientMock has no specified result set. Check your test setup!');
        }

        const delayMs = this.nextDelayList.shift() || 0;

        return of(this.nextResultList.shift() as T).pipe(delay(delayMs));
    }

    public setFailOnNextRequest(
        config: {
            // eslint-disable-next-line  @typescript-eslint/no-explicit-any
            error?: any;
            headers?: HttpHeaders;
            status?: number;
            statusText?: string;
            url?: string;
        },
        append: boolean = false,
    ): void {
        this.failOnNextGetRequestList = append ? [...this.failOnNextGetRequestList, config] : [config];
    }

    public setFailOnNextRequestList(
        configList: Array<{
            // eslint-disable-next-line  @typescript-eslint/no-explicit-any
            error?: any;
            headers?: HttpHeaders;
            status?: number;
            statusText?: string;
            url?: string;
        }>,
    ): void {
        this.failOnNextGetRequestList = configList;
    }
}
