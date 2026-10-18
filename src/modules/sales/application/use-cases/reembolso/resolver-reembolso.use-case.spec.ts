import {
  EstadoReembolso,
  MetodoPago,
  TipoNotificacionReembolso,
} from '../../../domain/enums';
import {
  InvalidRequestError,
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { ReembolsoRepository } from '../../../domain/repositories/reembolso.repository';
import { AprobarReembolsoUseCase } from './aprobar-reembolso.use-case';
import { ConfirmarDevolucionReembolsoUseCase } from './confirmar-devolucion-reembolso.use-case';
import { GetReembolsoByIdUseCase } from './get-reembolso-by-id.use-case';
import { RechazarReembolsoUseCase } from './rechazar-reembolso.use-case';
import { makeSolicitud } from './reembolso.fixtures';

describe('Resolver solicitudes de reembolso', () => {
  const USER_ID = 'a1b2c3d4-1111-4d2b-8b1f-4c6c3a7a0001';

  const findById = jest.fn();
  const cambiarEstado = jest.fn();
  const reembolsoRepository = {
    findById,
    cambiarEstado,
  } as unknown as jest.Mocked<ReembolsoRepository>;

  const detalle = { evidencia_url: 'https://docs/acta-recepcion.pdf' };
  const getExecute = jest.fn();
  const getReembolsoById = {
    execute: getExecute,
  } as unknown as GetReembolsoByIdUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    cambiarEstado.mockResolvedValue(true);
    getExecute.mockResolvedValue(detalle);
  });

  describe('AprobarReembolsoUseCase (RF-A042)', () => {
    const useCase = new AprobarReembolsoUseCase(
      reembolsoRepository,
      getReembolsoById,
    );

    it('aprueba una solicitud pendiente con motivo y evidencia y avisa al cliente', async () => {
      findById.mockResolvedValue(makeSolicitud());

      await expect(useCase.execute(3, USER_ID)).resolves.toBe(detalle);
      expect(cambiarEstado).toHaveBeenCalledWith(
        3,
        EstadoReembolso.PENDIENTE,
        expect.objectContaining({
          estado: EstadoReembolso.APROBADO,
          resuelto_por: USER_ID,
          fecha_resolucion: expect.any(Date) as Date,
        }),
        expect.objectContaining({ tipo: TipoNotificacionReembolso.APROBADO }),
      );
    });

    it('responde 404 si la solicitud no existe', async () => {
      findById.mockResolvedValue(null);

      await expect(useCase.execute(3, USER_ID)).rejects.toThrow(
        ResourceNotFoundError,
      );
    });

    it('no aprueba una solicitud sin evidencia adjunta', async () => {
      findById.mockResolvedValue(makeSolicitud({ evidencia_key: null }));

      await expect(useCase.execute(3, USER_ID)).rejects.toThrow(
        'requiere motivo y evidencia adjunta',
      );
      expect(cambiarEstado).not.toHaveBeenCalled();
    });

    it('no aprueba una solicitud con el motivo vacío', async () => {
      findById.mockResolvedValue(makeSolicitud({ motivo_cliente: '   ' }));

      await expect(useCase.execute(3, USER_ID)).rejects.toThrow(
        ResourceConflictError,
      );
    });

    it.each([
      EstadoReembolso.APROBADO,
      EstadoReembolso.RECHAZADO,
      EstadoReembolso.REEMBOLSADO,
    ])('no aprueba una solicitud que ya está %s', async (estado) => {
      findById.mockResolvedValue(makeSolicitud({ estado }));

      await expect(useCase.execute(3, USER_ID)).rejects.toThrow(
        ResourceConflictError,
      );
      expect(cambiarEstado).not.toHaveBeenCalled();
    });

    it('responde 409 si otro usuario la resolvió mientras tanto', async () => {
      findById.mockResolvedValue(makeSolicitud());
      cambiarEstado.mockResolvedValue(false);

      await expect(useCase.execute(3, USER_ID)).rejects.toThrow(
        'cambió de estado mientras tanto',
      );
    });
  });

  describe('RechazarReembolsoUseCase (RF-A043)', () => {
    const useCase = new RechazarReembolsoUseCase(
      reembolsoRepository,
      getReembolsoById,
    );

    it('rechaza una solicitud pendiente guardando el motivo y avisa al cliente', async () => {
      findById.mockResolvedValue(makeSolicitud());

      await expect(
        useCase.execute(3, '  Fuera del plazo de 48 horas.  ', USER_ID),
      ).resolves.toBe(detalle);
      expect(cambiarEstado).toHaveBeenCalledWith(
        3,
        EstadoReembolso.PENDIENTE,
        expect.objectContaining({
          estado: EstadoReembolso.RECHAZADO,
          motivo_rechazo: 'Fuera del plazo de 48 horas.',
          resuelto_por: USER_ID,
        }),
        expect.objectContaining({
          tipo: TipoNotificacionReembolso.RECHAZADO,
          mensaje: expect.stringContaining(
            'Fuera del plazo de 48 horas.',
          ) as string,
        }),
      );
    });

    it('exige el motivo del rechazo', async () => {
      await expect(useCase.execute(3, '   ', USER_ID)).rejects.toThrow(
        InvalidRequestError,
      );
      expect(findById).not.toHaveBeenCalled();
    });

    it('no rechaza una solicitud que ya fue rechazada (sin vuelta atrás)', async () => {
      findById.mockResolvedValue(
        makeSolicitud({ estado: EstadoReembolso.RECHAZADO }),
      );

      await expect(useCase.execute(3, 'Otro motivo', USER_ID)).rejects.toThrow(
        ResourceConflictError,
      );
    });

    it('responde 404 si la solicitud no existe', async () => {
      findById.mockResolvedValue(null);

      await expect(useCase.execute(3, 'Motivo', USER_ID)).rejects.toThrow(
        ResourceNotFoundError,
      );
    });
  });

  describe('ConfirmarDevolucionReembolsoUseCase (RF-A044)', () => {
    const useCase = new ConfirmarDevolucionReembolsoUseCase(
      reembolsoRepository,
      getReembolsoById,
    );

    it('pasa a reembolsado una solicitud aprobada pagada con Culqi', async () => {
      findById.mockResolvedValue(
        makeSolicitud({ estado: EstadoReembolso.APROBADO }),
      );

      await expect(useCase.execute(3)).resolves.toBe(detalle);
      expect(cambiarEstado).toHaveBeenCalledWith(
        3,
        EstadoReembolso.APROBADO,
        { estado: EstadoReembolso.REEMBOLSADO },
        expect.objectContaining({ tipo: TipoNotificacionReembolso.PROCESADO }),
      );
    });

    it('no confirma la devolución de un pago en efectivo', async () => {
      findById.mockResolvedValue(
        makeSolicitud({
          estado: EstadoReembolso.APROBADO,
          metodo_pago: MetodoPago.EFECTIVO,
        }),
      );

      await expect(useCase.execute(3)).rejects.toThrow('no se pagó con Culqi');
      expect(cambiarEstado).not.toHaveBeenCalled();
    });

    it.each([
      EstadoReembolso.PENDIENTE,
      EstadoReembolso.RECHAZADO,
      EstadoReembolso.REEMBOLSADO,
    ])('no confirma la devolución de una solicitud %s', async (estado) => {
      findById.mockResolvedValue(makeSolicitud({ estado }));

      await expect(useCase.execute(3)).rejects.toThrow(ResourceConflictError);
    });
  });
});
