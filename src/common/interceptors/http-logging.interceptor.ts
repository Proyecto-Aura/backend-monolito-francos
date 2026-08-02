import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.logger.log(
          `${request.method} ${request.originalUrl} -> ${response.statusCode} (${Date.now() - startedAt} ms)`,
        );
      }),
      catchError((error: unknown) => {
        const statusCode = this.getStatusCode(error);
        const message =
          error instanceof Error ? error.message : 'Error desconocido';

        this.logger.error(
          `${request.method} ${request.originalUrl} -> ${statusCode} (${Date.now() - startedAt} ms): ${message}`,
          error instanceof Error ? error.stack : undefined,
        );

        return throwError(() => error);
      }),
    );
  }

  private getStatusCode(error: unknown): number {
    if (error instanceof HttpException) {
      return error.getStatus();
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof error.statusCode === 'number'
    ) {
      return error.statusCode;
    }

    return 500;
  }
}
