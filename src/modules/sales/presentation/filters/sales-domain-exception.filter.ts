import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Request, Response } from 'express';
import { SalesDomainError } from '../../domain/errors/sales-domain.errors';

@Catch(SalesDomainError)
export class SalesDomainExceptionFilter implements ExceptionFilter {
  catch(exception: SalesDomainError, host: ArgumentsHost): void {
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
