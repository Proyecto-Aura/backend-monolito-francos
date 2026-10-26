import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { ResourceConflictError } from '../../domain/errors/sales-domain.errors';
import { PrismaReembolsoRepository } from './prisma-reembolso.repository';

// El unitario no depende del .env real: PrismaService no se instancia.
jest.mock('../../../../config/envs', () => ({ envs: {} }));

describe('PrismaReembolsoRepository (portal del cliente)', () => {
  const create = jest.fn();
  const queryRaw = jest.fn();
  const prisma = {
    reembolso: { create },
    $queryRaw: queryRaw,
  } as unknown as PrismaService;
  const repository = new PrismaReembolsoRepository(prisma);

  const params = {
    id: 42,
    codigo: 'SOL-000042',
    pago_id: 5,
    monto: 249.9,
    motivo_cliente: 'Producto en mal estado: bolsa rota en 4 packs.',
    evidencia_key: 'reembolsos/SOL-000042/acta.pdf',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reserva el id con nextval y arma el código SOL-000042', async () => {
    queryRaw.mockResolvedValue([{ nextval: BigInt(42) }]);

    await expect(repository.reservarCodigo()).resolves.toEqual({
      id: 42,
      codigo: 'SOL-000042',
    });
  });

  it('traduce el P2002 de uq_reembolso_pago (carrera) a un 409', async () => {
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.8.0',
      }),
    );

    const ejecucion = repository.crearSolicitud(params);

    await expect(ejecucion).rejects.toBeInstanceOf(ResourceConflictError);
    await expect(ejecucion).rejects.toThrow(
      'El pedido ya tiene una solicitud de reembolso registrada',
    );
  });

  it('deja pasar cualquier otro error', async () => {
    const fallo = new Error('conexión perdida');
    create.mockRejectedValue(fallo);

    await expect(repository.crearSolicitud(params)).rejects.toBe(fallo);
  });
});
