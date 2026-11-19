import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Request, Response } from 'express';
import {
  AccountLockedError,
  AuthDomainError,
} from '../../domain/errors/auth-domain.errors';

@Catch(AuthDomainError)
export class AuthDomainExceptionFilter implements ExceptionFilter {
  catch(exception: AuthDomainError, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    if (exception instanceof AccountLockedError) {
      response.setHeader('Retry-After', String(exception.retryAfterSeconds));
    }

    response.status(exception.statusCode).json({
      statusCode: exception.statusCode,
      message: exception.message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
