import { SolicitudProduccionEntity } from '../../../domain/entities';
import { EstadoSolicitudProduccion as Estado } from '../../../domain/enums';
import { SolicitudProduccionRepository } from '../../../domain/repositories/solicitud-produccion.repository';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { ActualizarFechaLimiteSolicitudProduccionUseCase } from './actualizar-fecha-limite-solicitud-produccion.use-case';

describe('ActualizarFechaLimiteSolicitudProduccionUseCase', () => {
  const findById = jest.fn();
  const updateFechaLimite = jest.fn();
  const repository = {
    findById,
    updateFechaLimite,
  } as unknown as SolicitudProduccionRepository;
  const useCase = new ActualizarFechaLimiteSolicitudProduccionUseCase(
    repository,
  );
  const fecha = new Date('2026-10-30T00:00:00Z');
  const solicitud = new SolicitudProduccionEntity(
    1,
    'FR-SPR-001-261030',
    Estado.PENDIENTE,
    fecha,
    null,
    'usuario-id',
    'Usuario Inventario Prueba',
    fecha,
    fecha,
  );
  const dto = { fecha_limite: '2026-11-15' };

  beforeEach(() => jest.resetAllMocks());

  it('actualiza la fecha límite de una solicitud pendiente convirtiéndola a Date', async () => {
    const actualizada = {
      ...solicitud,
      fecha_limite: new Date(dto.fecha_limite),
    };
    findById.mockResolvedValue(solicitud);
    updateFechaLimite.mockResolvedValue(actualizada);

    await expect(useCase.execute(1, dto)).resolves.toBe(actualizada);
    expect(findById).toHaveBeenCalledWith(1);
    expect(updateFechaLimite).toHaveBeenCalledTimes(1);
    expect(updateFechaLimite).toHaveBeenCalledWith(1, new Date('2026-11-15'));
  });

  it('devuelve 404 sin actualizar cuando la solicitud no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(useCase.execute(99, dto)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(updateFechaLimite).not.toHaveBeenCalled();
  });

  it.each([Estado.EN_PROCESO, Estado.ENTREGADO, Estado.RECHAZADO])(
    'devuelve 409 sin actualizar si el estado es %s',
    async (estado) => {
      findById.mockResolvedValue({ ...solicitud, estado });

      await expect(useCase.execute(1, dto)).rejects.toBeInstanceOf(
        ResourceConflictError,
      );
      expect(updateFechaLimite).not.toHaveBeenCalled();
    },
  );
});
