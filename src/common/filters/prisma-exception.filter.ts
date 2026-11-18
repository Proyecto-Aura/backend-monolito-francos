import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

// Mensajes legibles para los códigos de error de Prisma más comunes que
// pueden escaparse de un use-case sin mapear a un error de dominio propio.
// No se expone el mensaje crudo de Prisma: puede revelar nombres de tablas,
// columnas o restricciones internas.
const MENSAJES_POR_CODIGO: Record<string, string> = {
  P2002: 'Ya existe un registro con ese valor único',
  P2003: 'La operación viola una relación con otro registro',
  P2025: 'El registro relacionado no existe',
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    this.logger.error(
      `[${exception.code}] ${request.method} ${request.url}: ${exception.message}`,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message:
        MENSAJES_POR_CODIGO[exception.code] ??
        'Ocurrió un error inesperado al procesar la solicitud',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
