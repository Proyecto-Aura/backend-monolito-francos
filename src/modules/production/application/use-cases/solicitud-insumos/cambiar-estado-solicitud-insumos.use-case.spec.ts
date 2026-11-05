import { SolicitudInsumosEntity } from '../../../domain/entities';
import { EstadoSolicitudInsumos as Estado } from '../../../domain/enums';
import { SolicitudInsumosRepository } from '../../../domain/repositories/solicitud-insumos.repository';
import { SolicitudInsumosDetalleRepository } from '../../../domain/repositories/solicitud-insumos-detalle.repository';
import { RegistrarSalidaInsumoUseCase } from '../../../../inventory/application/use-cases/movimiento-insumo/registrar-salida-insumo.use-case';
import {
  InvalidRequestError,
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { CambiarEstadoSolicitudInsumosUseCase } from './cambiar-estado-solicitud-insumos.use-case';

describe('Cambiar estado de solicitud de insumos', () => {
  const repo = { findById: jest.fn(), updateEstado: jest.fn() };
  const detalles = { findBySolicitudId: jest.fn() };
  const salida = { executeMany: jest.fn() };
  const useCase = new CambiarEstadoSolicitudInsumosUseCase(
    repo as unknown as SolicitudInsumosRepository,
    detalles as unknown as SolicitudInsumosDetalleRepository,
    salida as unknown as RegistrarSalidaInsumoUseCase,
  );
  const fecha = new Date('2026-11-04T12:00:00Z');
  const solicitud = (estado: Estado) =>
    new SolicitudInsumosEntity(
      7,
      'SIN-007',
      null,
      estado,
      fecha,
      null,
      'user-id',
      'Usuario',
      fecha,
      fecha,
    );
  const lineas = [
    { insumo_id: 10, cantidad_solicitada: 10.25 },
    { insumo_id: 20, cantidad_solicitada: 25 },
  ];
  beforeEach(() => {
    jest.resetAllMocks();
    detalles.findBySolicitudId.mockResolvedValue(lineas);
    salida.executeMany.mockResolvedValue([]);
  });

  const estados = Object.values(Estado);
  const roles = [
    'admin',
    'inventario',
    'produccion',
    'ventas',
    'cliente',
    'sin rol',
  ];
  it.each(
    roles.flatMap((rol) =>
      estados.flatMap((desde) =>
        estados.map((hasta) => ({ rol, desde, hasta })),
      ),
    ),
  )('$rol: $desde -> $hasta', async ({ rol, desde, hasta }) => {
    repo.findById.mockResolvedValue(solicitud(desde));
    const transicion =
      (desde === Estado.PENDIENTE &&
        [Estado.EN_PROCESO, Estado.RECHAZADO].includes(hasta)) ||
      (desde === Estado.EN_PROCESO && hasta === Estado.ENTREGADO);
    const permiso =
      hasta === Estado.RECHAZADO
        ? ['admin', 'inventario', 'produccion'].includes(rol)
        : ['admin', 'inventario'].includes(rol);
    const asignados = rol === 'sin rol' ? [] : [rol];
    if (!transicion || !permiso) {
      await expect(useCase.execute(7, hasta, asignados)).rejects.toBeInstanceOf(
        ResourceConflictError,
      );
      expect(repo.updateEstado).not.toHaveBeenCalled();
      expect(salida.executeMany).not.toHaveBeenCalled();
      expect(detalles.findBySolicitudId).not.toHaveBeenCalled();
      return;
    }
    const actualizada = solicitud(hasta);
    repo.updateEstado.mockResolvedValue(actualizada);
    await expect(useCase.execute(7, hasta, asignados)).resolves.toBe(
      actualizada,
    );
    expect(repo.updateEstado).toHaveBeenCalledWith(7, hasta);
    if (hasta === Estado.ENTREGADO) {
      expect(detalles.findBySolicitudId).toHaveBeenCalledWith(7);
      expect(salida.executeMany).toHaveBeenCalledWith(
        lineas.map((linea) => ({
          insumo_id: linea.insumo_id,
          cantidad: linea.cantidad_solicitada,
          razon: 'Salida por solicitud de insumos SIN-007',
          solicitud_insumos_id: 7,
        })),
      );
      expect(salida.executeMany.mock.invocationCallOrder[0]).toBeLessThan(
        repo.updateEstado.mock.invocationCallOrder[0],
      );
    } else {
      expect(salida.executeMany).not.toHaveBeenCalled();
      expect(detalles.findBySolicitudId).not.toHaveBeenCalled();
    }
  });

  it.each(['admin', 'inventario'])(
    '%s entrega las cantidades explícitas asociándolas por id y no por posición',
    async (rol) => {
      repo.findById.mockResolvedValue(solicitud(Estado.EN_PROCESO));
      const actualizada = solicitud(Estado.ENTREGADO);
      repo.updateEstado.mockResolvedValue(actualizada);
      await expect(
        useCase.execute(
          7,
          Estado.ENTREGADO,
          [rol],
          [
            { insumo_id: 20, cantidad_entregada: 40 },
            { insumo_id: 10, cantidad_entregada: 3.5 },
          ],
        ),
      ).resolves.toBe(actualizada);
      expect(salida.executeMany).toHaveBeenCalledWith([
        {
          insumo_id: 10,
          cantidad: 3.5,
          razon: 'Salida por solicitud de insumos SIN-007',
          solicitud_insumos_id: 7,
        },
        {
          insumo_id: 20,
          cantidad: 40,
          razon: 'Salida por solicitud de insumos SIN-007',
          solicitud_insumos_id: 7,
        },
      ]);
      expect(salida.executeMany).toHaveBeenCalledTimes(1);
      expect(repo.updateEstado).toHaveBeenCalledWith(7, Estado.ENTREGADO);
      expect(salida.executeMany.mock.invocationCallOrder[0]).toBeLessThan(
        repo.updateEstado.mock.invocationCallOrder[0],
      );
      expect(lineas.map((linea) => linea.cantidad_solicitada)).toEqual([
        10.25, 25,
      ]);
    },
  );

  it.each([
    { caso: 'faltante', items: [{ insumo_id: 10, cantidad_entregada: 1 }] },
    {
      caso: 'sobrante',
      items: [
        { insumo_id: 10, cantidad_entregada: 1 },
        { insumo_id: 20, cantidad_entregada: 1 },
        { insumo_id: 99, cantidad_entregada: 1 },
      ],
    },
    {
      caso: 'ajeno con la misma cantidad de líneas',
      items: [
        { insumo_id: 10, cantidad_entregada: 1 },
        { insumo_id: 99, cantidad_entregada: 1 },
      ],
    },
    {
      caso: 'repetido que reemplaza otra línea',
      items: [
        { insumo_id: 10, cantidad_entregada: 1 },
        { insumo_id: 10, cantidad_entregada: 2 },
      ],
    },
    {
      caso: 'repetido adicional con todos los ids presentes',
      items: [
        { insumo_id: 10, cantidad_entregada: 1 },
        { insumo_id: 20, cantidad_entregada: 1 },
        { insumo_id: 10, cantidad_entregada: 2 },
      ],
    },
  ])('rechaza items $caso antes de tocar stock o estado', async ({ items }) => {
    repo.findById.mockResolvedValue(solicitud(Estado.EN_PROCESO));
    await expect(
      useCase.execute(7, Estado.ENTREGADO, ['inventario'], items),
    ).rejects.toThrow(
      new InvalidRequestError(
        'Las cantidades entregadas no coinciden con las líneas del detalle',
      ),
    );
    expect(salida.executeMany).not.toHaveBeenCalled();
    expect(repo.updateEstado).not.toHaveBeenCalled();
  });

  it.each(['admin', 'inventario'])(
    '%s no actualiza estado si las cantidades explícitas no tienen stock',
    async (rol) => {
      repo.findById.mockResolvedValue(solicitud(Estado.EN_PROCESO));
      const error = new ResourceConflictError('Stock insuficiente');
      salida.executeMany.mockRejectedValue(error);
      await expect(
        useCase.execute(
          7,
          Estado.ENTREGADO,
          [rol],
          [
            { insumo_id: 10, cantidad_entregada: 12 },
            { insumo_id: 20, cantidad_entregada: 35 },
          ],
        ),
      ).rejects.toBe(error);
      expect(salida.executeMany).toHaveBeenCalledWith([
        {
          insumo_id: 10,
          cantidad: 12,
          razon: 'Salida por solicitud de insumos SIN-007',
          solicitud_insumos_id: 7,
        },
        {
          insumo_id: 20,
          cantidad: 35,
          razon: 'Salida por solicitud de insumos SIN-007',
          solicitud_insumos_id: 7,
        },
      ]);
      expect(repo.updateEstado).not.toHaveBeenCalled();
    },
  );

  it.each(['admin', 'inventario'])(
    '%s no cambia estado si executeMany rechaza por stock insuficiente',
    async (rol) => {
      repo.findById.mockResolvedValue(solicitud(Estado.EN_PROCESO));
      const error = new ResourceConflictError('Stock insuficiente');
      salida.executeMany.mockRejectedValue(error);
      await expect(useCase.execute(7, Estado.ENTREGADO, [rol])).rejects.toBe(
        error,
      );
      expect(salida.executeMany).toHaveBeenCalledTimes(1);
      expect(repo.updateEstado).not.toHaveBeenCalled();
    },
  );

  it('propaga errores inesperados de la salida sin actualizar el estado', async () => {
    repo.findById.mockResolvedValue(solicitud(Estado.EN_PROCESO));
    const error = new Error('Fallo de persistencia');
    salida.executeMany.mockRejectedValue(error);
    await expect(
      useCase.execute(7, Estado.ENTREGADO, ['inventario']),
    ).rejects.toBe(error);
    expect(repo.updateEstado).not.toHaveBeenCalled();
  });

  it('devuelve 404 sin salidas ni cambios si no existe la solicitud', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(
      useCase.execute(99, Estado.ENTREGADO, ['admin']),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(detalles.findBySolicitudId).not.toHaveBeenCalled();
    expect(salida.executeMany).not.toHaveBeenCalled();
    expect(repo.updateEstado).not.toHaveBeenCalled();
  });

  it('permite avanzar a un usuario que también tiene inventario', async () => {
    repo.findById.mockResolvedValue(solicitud(Estado.PENDIENTE));
    await useCase.execute(7, Estado.EN_PROCESO, ['produccion', 'inventario']);
    expect(repo.updateEstado).toHaveBeenCalledWith(7, Estado.EN_PROCESO);
  });
});
