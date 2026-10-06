import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Request, Response } from 'express';
import { StrategicDomainError } from '../../domain/errors/strategic-domain.errors';

@Catch(StrategicDomainError)
export class StrategicDomainExceptionFilter implements ExceptionFilter {
  catch(exception: StrategicDomainError, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    response.status(exception.statusCode).json({
      statusCode: exception.statusCode,
      message: exception.message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
