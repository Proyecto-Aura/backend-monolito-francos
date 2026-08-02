import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Request, Response } from 'express';
import { CatalogDomainError } from '../../domain/errors/catalog-domain.errors';

@Catch(CatalogDomainError)
export class CatalogDomainExceptionFilter implements ExceptionFilter {
  catch(exception: CatalogDomainError, host: ArgumentsHost): void {
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
