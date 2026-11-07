import { LoteProductoTerminadoRepository } from '../../../domain/repositories/lote-producto-terminado.repository';
import { SolicitudProduccionDetalleRepository } from '../../../domain/repositories/solicitud-produccion-detalle.repository';
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
  const detalles = { findBySolicitudId: jest.fn() };
  const lotes = { findProductoTerminadoIdsConLotePorSolicitud: jest.fn() };
  const useCase = new CambiarEstadoSolicitudProduccionUseCase(
    repository as unknown as SolicitudProduccionRepository,
    detalles as unknown as SolicitudProduccionDetalleRepository,
    lotes as unknown as LoteProductoTerminadoRepository,
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

  beforeEach(() => {
    jest.resetAllMocks();
    detalles.findBySolicitudId.mockResolvedValue([
      { producto_terminado_id: 10 },
      { producto_terminado_id: 20 },
    ]);
    lotes.findProductoTerminadoIdsConLotePorSolicitud.mockResolvedValue([
      10, 20,
    ]);
  });

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
      ...(rol === 'inventario'
        ? [
            { rol, desde: Estado.PENDIENTE, hasta: Estado.EN_PROCESO },
            { rol, desde: Estado.EN_PROCESO, hasta: Estado.ENTREGADO },
          ]
        : []),
      { rol, desde: Estado.EN_PROCESO, hasta: Estado.RECHAZADO },
    ]),
  )('$rol no puede pasar de $desde a $hasta', async ({ rol, desde, hasta }) => {
    repository.findById.mockResolvedValue(solicitud(desde));
    await expect(useCase.execute(1, hasta, [rol])).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(repository.updateEstado).not.toHaveBeenCalled();
  });

  it.each([
    [Estado.PENDIENTE, Estado.EN_PROCESO],
    [Estado.EN_PROCESO, Estado.ENTREGADO],
  ])('admin puede pasar de %s a %s', async (desde, hasta) => {
    repository.findById.mockResolvedValue(solicitud(desde));
    const actualizada = solicitud(hasta);
    repository.updateEstado.mockResolvedValue(actualizada);
    await expect(useCase.execute(1, hasta, ['admin'])).resolves.toBe(
      actualizada,
    );
    expect(repository.updateEstado).toHaveBeenCalledTimes(1);
    expect(repository.updateEstado).toHaveBeenCalledWith(1, hasta);
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

  it.each(['admin', 'produccion'])(
    '%s no puede entregar si falta el lote de una línea',
    async (rol) => {
      repository.findById.mockResolvedValue(solicitud(Estado.EN_PROCESO));
      // Un id ajeno y repetido no reemplaza el producto 20 que falta.
      lotes.findProductoTerminadoIdsConLotePorSolicitud.mockResolvedValue([
        10, 10, 99,
      ]);
      await expect(useCase.execute(1, Estado.ENTREGADO, [rol])).rejects.toThrow(
        new ResourceConflictError(
          'Faltan lotes por registrar para completar esta solicitud',
        ),
      );
      expect(detalles.findBySolicitudId).toHaveBeenCalledWith(1);
      expect(
        lotes.findProductoTerminadoIdsConLotePorSolicitud,
      ).toHaveBeenCalledWith(1);
      expect(repository.updateEstado).not.toHaveBeenCalled();
    },
  );

  it.each(['admin', 'produccion'])(
    '%s puede entregar cuando cada producto tiene al menos un lote',
    async (rol) => {
      repository.findById.mockResolvedValue(solicitud(Estado.EN_PROCESO));
      lotes.findProductoTerminadoIdsConLotePorSolicitud.mockResolvedValue([
        20, 10, 10,
      ]);
      const actualizada = solicitud(Estado.ENTREGADO);
      repository.updateEstado.mockResolvedValue(actualizada);
      await expect(useCase.execute(1, Estado.ENTREGADO, [rol])).resolves.toBe(
        actualizada,
      );
      expect(repository.updateEstado).toHaveBeenCalledWith(1, Estado.ENTREGADO);
    },
  );

  it('iniciar no consulta ni exige lotes', async () => {
    repository.findById.mockResolvedValue(solicitud(Estado.PENDIENTE));
    lotes.findProductoTerminadoIdsConLotePorSolicitud.mockResolvedValue([]);
    await useCase.execute(1, Estado.EN_PROCESO, ['admin']);
    expect(detalles.findBySolicitudId).not.toHaveBeenCalled();
    expect(
      lotes.findProductoTerminadoIdsConLotePorSolicitud,
    ).not.toHaveBeenCalled();
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
