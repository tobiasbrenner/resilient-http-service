import { HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';

export type THttpGetOption = {
    headers?:
        | HttpHeaders
        | {
              [header: string]: string | string[];
          };
    context?: HttpContext;
    params?:
        | HttpParams
        | {
              [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean>;
          };
    reportProgress?: boolean;
    responseType?: 'json';
    withCredentials?: boolean;
    transferCache?:
        | {
              includeHeaders?: string[];
          }
        | boolean;
};
