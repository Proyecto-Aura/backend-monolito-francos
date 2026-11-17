import {
  SolicitudInsumosDetalleEntity,
  SolicitudInsumosEntity,
} from '../../../domain/entities';
import { UnidadMedidaInsumo } from '../../../../inventory/domain/enums';
import { EstadoSolicitudInsumos as Estado } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { InsumoRepository } from '../../../../inventory/domain/repositories/insumo.repository';
import { SolicitudInsumosRepository } from '../../../domain/repositories/solicitud-insumos.repository';
import { SolicitudInsumosDetalleRepository } from '../../../domain/repositories/solicitud-insumos-detalle.repository';
import { AgregarDetalleLineaInsumoUseCase } from './agregar-detalle-linea.use-case';
import { ActualizarDetalleLineaInsumoUseCase } from './actualizar-detalle-linea.use-case';
import { EliminarDetalleLineaInsumoUseCase } from './eliminar-detalle-linea.use-case';

describe('Detalle de solicitudes de insumos', () => {
  const detalles = {
    findById: jest.fn(),
    findBySolicitudId: jest.fn(),
    existsByInsumoEnSolicitud: jest.fn(),
    agregar: jest.fn(),
    actualizarCantidad: jest.fn(),
    eliminar: jest.fn(),
  } satisfies jest.Mocked<SolicitudInsumosDetalleRepository>;
  const solicitudes = {
    findById: jest.fn(),
  };
  const insumos = {
    findById: jest.fn(),
  };
  const fecha = new Date('2026-10-29T00:00:00Z');
  const solicitud = new SolicitudInsumosEntity(
    1,
    'SIN-001',
    null,
    Estado.PENDIENTE,
    fecha,
    null,
    'user-id',
    'Usuario Prueba',
    fecha,
    fecha,
  );
  const linea = new SolicitudInsumosDetalleEntity(
    7,
    1,
    10,
    'INS-10',
    'Harina',
    UnidadMedidaInsumo.KG,
    100,
    50,
    fecha,
  );
  const dto = { insumo_id: 10, cantidad_solicitada: 60 };
  const agregar = new AgregarDetalleLineaInsumoUseCase(
    detalles,
    solicitudes as unknown as SolicitudInsumosRepository,
    insumos as unknown as InsumoRepository,
  );
  const actualizar = new ActualizarDetalleLineaInsumoUseCase(
    detalles,
    solicitudes as unknown as SolicitudInsumosRepository,
  );
  const eliminar = new EliminarDetalleLineaInsumoUseCase(
    detalles,
    solicitudes as unknown as SolicitudInsumosRepository,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    solicitudes.findById.mockResolvedValue(solicitud);
    detalles.findById.mockResolvedValue(linea);
    detalles.findBySolicitudId.mockResolvedValue([linea, { ...linea, id: 8 }]);
    detalles.existsByInsumoEnSolicitud.mockResolvedValue(false);
    insumos.findById.mockResolvedValue({ id: 10 });
  });

  it('agrega la línea al padre pendiente validando el insumo y su unicidad', async () => {
    detalles.agregar.mockResolvedValue(linea);
    await expect(agregar.execute(1, dto)).resolves.toBe(linea);
    expect(insumos.findById).toHaveBeenCalledWith(10);
    expect(detalles.existsByInsumoEnSolicitud).toHaveBeenCalledWith(1, 10);
    expect(detalles.agregar).toHaveBeenCalledWith({
      solicitud_insumos_id: 1,
      ...dto,
    });
  });

  it('no agrega una línea si no existe la solicitud', async () => {
    solicitudes.findById.mockResolvedValue(null);
    await expect(agregar.execute(99, dto)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(insumos.findById).not.toHaveBeenCalled();
    expect(detalles.agregar).not.toHaveBeenCalled();
  });

  it('no agrega insumos inexistentes', async () => {
    insumos.findById.mockResolvedValue(null);
    await expect(agregar.execute(1, dto)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(detalles.agregar).not.toHaveBeenCalled();
  });

  it('no agrega un insumo ya presente en la misma solicitud', async () => {
    detalles.existsByInsumoEnSolicitud.mockResolvedValue(true);
    await expect(agregar.execute(1, dto)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(detalles.agregar).not.toHaveBeenCalled();
  });

  it('actualiza solo la cantidad de una línea pendiente', async () => {
    detalles.actualizarCantidad.mockResolvedValue({
      ...linea,
      cantidad_solicitada: 60,
    });
    await expect(
      actualizar.execute(7, { cantidad_solicitada: 60 }),
    ).resolves.toEqual({ ...linea, cantidad_solicitada: 60 });
    expect(solicitudes.findById).toHaveBeenCalledWith(1);
    expect(detalles.actualizarCantidad).toHaveBeenCalledWith(7, 60);
  });

  it('elimina una línea si queda al menos otra', async () => {
    await eliminar.execute(7);
    expect(detalles.findBySolicitudId).toHaveBeenCalledWith(1);
    expect(detalles.eliminar).toHaveBeenCalledWith(7);
  });

  it.each([0, 1])('no elimina cuando quedan %i líneas', async (cantidad) => {
    detalles.findBySolicitudId.mockResolvedValue(
      Array.from({ length: cantidad }, () => linea),
    );
    await expect(eliminar.execute(7)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(detalles.eliminar).not.toHaveBeenCalled();
  });

  it.each([Estado.EN_PROCESO, Estado.ENTREGADO, Estado.RECHAZADO])(
    'bloquea todas las ediciones en estado %s',
    async (estado) => {
      solicitudes.findById.mockResolvedValue({ ...solicitud, estado });
      await expect(agregar.execute(1, dto)).rejects.toBeInstanceOf(
        ResourceConflictError,
      );
      await expect(actualizar.execute(7, dto)).rejects.toBeInstanceOf(
        ResourceConflictError,
      );
      await expect(eliminar.execute(7)).rejects.toBeInstanceOf(
        ResourceConflictError,
      );
      expect(detalles.agregar).not.toHaveBeenCalled();
      expect(detalles.actualizarCantidad).not.toHaveBeenCalled();
      expect(detalles.eliminar).not.toHaveBeenCalled();
    },
  );

  it('actualizar o eliminar una línea inexistente devuelve 404 sin mutar', async () => {
    detalles.findById.mockResolvedValue(null);
    await expect(actualizar.execute(99, dto)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    await expect(eliminar.execute(99)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(solicitudes.findById).not.toHaveBeenCalled();
    expect(detalles.actualizarCantidad).not.toHaveBeenCalled();
    expect(detalles.eliminar).not.toHaveBeenCalled();
  });

  it('no actualiza ni elimina si desaparece el padre', async () => {
    solicitudes.findById.mockResolvedValue(null);
    await expect(actualizar.execute(7, dto)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    await expect(eliminar.execute(7)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(detalles.actualizarCantidad).not.toHaveBeenCalled();
    expect(detalles.eliminar).not.toHaveBeenCalled();
  });
});
