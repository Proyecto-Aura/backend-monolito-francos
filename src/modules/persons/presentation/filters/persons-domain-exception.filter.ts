import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Request, Response } from 'express';
import { PersonsDomainError } from '../../domain/errors/persons-domain.errors';

@Catch(PersonsDomainError)
export class PersonsDomainExceptionFilter implements ExceptionFilter {
  catch(exception: PersonsDomainError, host: ArgumentsHost): void {
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
