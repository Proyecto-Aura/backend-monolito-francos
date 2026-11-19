import { ArgumentsHost, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

describe('PrismaExceptionFilter', () => {
  const ahora = new Date('2026-11-18T17:00:00.000Z');
  const request = { method: 'POST', url: '/api/v1/usuarios' };
  const detalleInterno =
    'Constraint persons.persona_numero_documento_key failed with value documento-interno';
  let logError: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(ahora);
    logError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each([
    { code: 'P2002', message: 'Ya existe un registro con ese valor único' },
    {
      code: 'P2003',
      message: 'La operación viola una relación con otro registro',
    },
    { code: 'P2025', message: 'El registro relacionado no existe' },
    {
      code: 'P9999',
      message: 'Ocurrió un error inesperado al procesar la solicitud',
    },
  ])(
    'responde 500 con mensaje legible para $code y registra el detalle internamente',
    ({ code, message }) => {
      const exception = new Prisma.PrismaClientKnownRequestError(
        detalleInterno,
        {
          code,
          clientVersion: 'test',
          meta: { modelName: 'Persona', target: ['numero_documento'] },
        },
      );
      const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const host = {
        switchToHttp: () => ({
          getResponse: () => response,
          getRequest: () => request,
        }),
      } as unknown as ArgumentsHost;

      new PrismaExceptionFilter().catch(exception, host);

      expect(response.status).toHaveBeenCalledTimes(1);
      expect(response.status).toHaveBeenCalledWith(500);
      expect(response.json).toHaveBeenCalledTimes(1);
      expect(response.json).toHaveBeenCalledWith({
        statusCode: 500,
        message,
        path: request.url,
        timestamp: ahora.toISOString(),
      });
      expect(logError).toHaveBeenCalledTimes(1);
      expect(logError).toHaveBeenCalledWith(
        `[${code}] POST ${request.url}: ${detalleInterno}`,
      );
      const [body] = response.json.mock.calls[0] as [Record<string, unknown>];
      const json = JSON.stringify(body);
      for (const interno of [
        code,
        detalleInterno,
        'Persona',
        'numero_documento',
        'documento-interno',
      ]) {
        expect(json).not.toContain(interno);
      }
      expect(body).not.toHaveProperty('meta');
      expect(body).not.toHaveProperty('stack');
    },
  );
});
