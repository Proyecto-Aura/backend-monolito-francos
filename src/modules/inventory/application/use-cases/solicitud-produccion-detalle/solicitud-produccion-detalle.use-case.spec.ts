import {
  SolicitudProduccionDetalleEntity,
  SolicitudProduccionEntity,
} from '../../../domain/entities';
import { UnidadMedidaPresentacion } from '../../../../catalog/domain/enums';
import { EstadoSolicitudProduccion as Estado } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { ProductoTerminadoRepository } from '../../../domain/repositories/producto-terminado.repository';
import { SolicitudProduccionRepository } from '../../../domain/repositories/solicitud-produccion.repository';
import { SolicitudProduccionDetalleRepository } from '../../../domain/repositories/solicitud-produccion-detalle.repository';
import { AgregarDetalleLineaUseCase } from './agregar-detalle-linea.use-case';
import { ActualizarDetalleLineaUseCase } from './actualizar-detalle-linea.use-case';
import { EliminarDetalleLineaUseCase } from './eliminar-detalle-linea.use-case';

describe('Detalle de solicitudes de producción', () => {
  const detalles = {
    findById: jest.fn(),
    findBySolicitudId: jest.fn(),
    existsByProductoEnSolicitud: jest.fn(),
    agregar: jest.fn(),
    actualizarCantidad: jest.fn(),
    eliminar: jest.fn(),
  } satisfies jest.Mocked<SolicitudProduccionDetalleRepository>;
  const solicitudes = {
    findById: jest.fn(),
  };
  const productos = {
    findById: jest.fn(),
  };
  const fecha = new Date('2026-10-29T00:00:00Z');
  const solicitud = new SolicitudProduccionEntity(
    1,
    'SPR-001',
    Estado.PENDIENTE,
    fecha,
    null,
    'user-id',
    'Usuario Prueba',
    fecha,
    fecha,
  );
  const linea = new SolicitudProduccionDetalleEntity(
    7,
    1,
    10,
    'SKU-10',
    2,
    'Chifles',
    3,
    'Snacks',
    4,
    250,
    UnidadMedidaPresentacion.GR,
    50,
    fecha,
    fecha,
  );
  const dto = { producto_terminado_id: 10, cantidad_solicitada: 60 };
  const agregar = new AgregarDetalleLineaUseCase(
    detalles,
    solicitudes as unknown as SolicitudProduccionRepository,
    productos as unknown as ProductoTerminadoRepository,
  );
  const actualizar = new ActualizarDetalleLineaUseCase(
    detalles,
    solicitudes as unknown as SolicitudProduccionRepository,
  );
  const eliminar = new EliminarDetalleLineaUseCase(
    detalles,
    solicitudes as unknown as SolicitudProduccionRepository,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    solicitudes.findById.mockResolvedValue(solicitud);
    detalles.findById.mockResolvedValue(linea);
    detalles.findBySolicitudId.mockResolvedValue([linea, { ...linea, id: 8 }]);
    detalles.existsByProductoEnSolicitud.mockResolvedValue(false);
    productos.findById.mockResolvedValue({ id: 10 });
  });

  it('agrega la línea al padre pendiente validando el producto y su unicidad', async () => {
    detalles.agregar.mockResolvedValue(linea);
    await expect(agregar.execute(1, dto)).resolves.toBe(linea);
    expect(productos.findById).toHaveBeenCalledWith(10);
    expect(detalles.existsByProductoEnSolicitud).toHaveBeenCalledWith(1, 10);
    expect(detalles.agregar).toHaveBeenCalledWith({
      solicitud_produccion_id: 1,
      ...dto,
    });
  });

  it('no agrega una línea si no existe la solicitud', async () => {
    solicitudes.findById.mockResolvedValue(null);
    await expect(agregar.execute(99, dto)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(productos.findById).not.toHaveBeenCalled();
    expect(detalles.agregar).not.toHaveBeenCalled();
  });

  it('no agrega productos inexistentes', async () => {
    productos.findById.mockResolvedValue(null);
    await expect(agregar.execute(1, dto)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(detalles.agregar).not.toHaveBeenCalled();
  });

  it('no agrega un producto ya presente en la misma solicitud', async () => {
    detalles.existsByProductoEnSolicitud.mockResolvedValue(true);
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
