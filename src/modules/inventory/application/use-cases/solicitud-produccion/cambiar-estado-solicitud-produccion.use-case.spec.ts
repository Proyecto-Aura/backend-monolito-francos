import { SolicitudProduccionEntity } from '../../../domain/entities';
import { EstadoSolicitudProduccion as Estado } from '../../../domain/enums';
import { SolicitudProduccionRepository } from '../../../domain/repositories/solicitud-produccion.repository';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { CambiarEstadoSolicitudProduccionUseCase } from './cambiar-estado-solicitud-produccion.use-case';

describe('Cambiar estado de solicitud de producción', () => {
  const repository = {
    findById: jest.fn(),
    updateEstado: jest.fn(),
  };
  const useCase = new CambiarEstadoSolicitudProduccionUseCase(
    repository as unknown as SolicitudProduccionRepository,
  );
  const fecha = new Date('2026-10-29T00:00:00Z');
  const solicitud = (estado: Estado) =>
    new SolicitudProduccionEntity(
      1,
      'SPR-001',
      estado,
      fecha,
      null,
      'usuario-id',
      'Usuario Prueba',
      fecha,
      fecha,
    );

  beforeEach(() => jest.resetAllMocks());

  const estados = Object.values(Estado);
  const permitidas = [
    [Estado.PENDIENTE, Estado.EN_PROCESO],
    [Estado.PENDIENTE, Estado.RECHAZADO],
    [Estado.EN_PROCESO, Estado.ENTREGADO],
  ];
  it.each(estados.flatMap((desde) => estados.map((hasta) => [desde, hasta])))(
    'producción: transición %s -> %s',
    async (desde, hasta) => {
      repository.findById.mockResolvedValue(solicitud(desde));
      const valida = permitidas.some(
        ([origen, destino]) => origen === desde && destino === hasta,
      );
      if (valida) {
        const actualizada = solicitud(hasta);
        repository.updateEstado.mockResolvedValue(actualizada);
        await expect(useCase.execute(1, hasta, ['produccion'])).resolves.toBe(
          actualizada,
        );
        expect(repository.updateEstado).toHaveBeenCalledWith(1, hasta);
      } else {
        await expect(
          useCase.execute(1, hasta, ['produccion']),
        ).rejects.toBeInstanceOf(ResourceConflictError);
        expect(repository.updateEstado).not.toHaveBeenCalled();
      }
    },
  );

  it.each(['admin', 'inventario'])(
    '%s puede rechazar desde pendiente',
    async (rol) => {
      repository.findById.mockResolvedValue(solicitud(Estado.PENDIENTE));
      repository.updateEstado.mockResolvedValue(solicitud(Estado.RECHAZADO));
      await useCase.execute(1, Estado.RECHAZADO, [rol]);
      expect(repository.updateEstado).toHaveBeenCalledWith(1, Estado.RECHAZADO);
    },
  );

  it.each(
    ['admin', 'inventario'].flatMap((rol) => [
      { rol, desde: Estado.PENDIENTE, hasta: Estado.EN_PROCESO },
      { rol, desde: Estado.EN_PROCESO, hasta: Estado.ENTREGADO },
      { rol, desde: Estado.EN_PROCESO, hasta: Estado.RECHAZADO },
    ]),
  )('$rol no puede pasar de $desde a $hasta', async ({ rol, desde, hasta }) => {
    repository.findById.mockResolvedValue(solicitud(desde));
    await expect(useCase.execute(1, hasta, [rol])).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(repository.updateEstado).not.toHaveBeenCalled();
  });

  it.each([[], ['ventas'], ['cliente']])(
    'roles %j no pueden rechazar',
    async (...roles) => {
      repository.findById.mockResolvedValue(solicitud(Estado.PENDIENTE));
      await expect(
        useCase.execute(1, Estado.RECHAZADO, roles as string[]),
      ).rejects.toBeInstanceOf(ResourceConflictError);
      expect(repository.updateEstado).not.toHaveBeenCalled();
    },
  );

  it('un usuario con varios roles puede avanzar si tiene producción', async () => {
    repository.findById.mockResolvedValue(solicitud(Estado.PENDIENTE));
    await useCase.execute(1, Estado.EN_PROCESO, ['inventario', 'produccion']);
    expect(repository.updateEstado).toHaveBeenCalledWith(1, Estado.EN_PROCESO);
  });

  it('devuelve 404 sin actualizar cuando la solicitud no existe', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(
      useCase.execute(99, Estado.EN_PROCESO, ['produccion']),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(repository.updateEstado).not.toHaveBeenCalled();
  });
});
