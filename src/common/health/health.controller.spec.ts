import { ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const queryRaw = jest.fn();
  const controller = new HealthController({
    $queryRaw: queryRaw,
  } as unknown as PrismaService);

  beforeEach(() => {
    queryRaw.mockReset();
  });

  it('devuelve el estado ok cuando la base de datos responde', async () => {
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    await expect(controller.check()).resolves.toEqual({ status: 'ok' });
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('devuelve 503 cuando la base de datos no responde', async () => {
    queryRaw.mockRejectedValue(new Error('connection failed'));

    await expect(controller.check()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
