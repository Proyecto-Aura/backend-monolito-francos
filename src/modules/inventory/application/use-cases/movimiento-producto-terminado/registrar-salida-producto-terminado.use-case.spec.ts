import {
  LoteProductoTerminadoEntity,
  ProductoTerminadoEntity,
} from '../../../domain/entities';
import { EstadoLoteProductoTerminado } from '../../../domain/enums';
import { UnidadMedidaPresentacion } from '../../../../catalog/domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { LoteProductoTerminadoRepository } from '../../../domain/repositories/lote-producto-terminado.repository';
import { MovimientoProductoTerminadoRepository } from '../../../domain/repositories/movimiento-producto-terminado.repository';
import { ProductoTerminadoRepository } from '../../../domain/repositories/producto-terminado.repository';
import { RegistrarSalidaProductoTerminadoUseCase } from './registrar-salida-producto-terminado.use-case';

describe('RegistrarSalidaProductoTerminadoUseCase', () => {
  const findByIdProductoTerminado = jest.fn();
  const productoTerminadoRepository = {
    findById: findByIdProductoTerminado,
  } as unknown as jest.Mocked<ProductoTerminadoRepository>;

  const findDisponiblesParaSalida = jest.fn();
  const loteProductoTerminadoRepository = {
    findDisponiblesParaSalida,
  } as unknown as jest.Mocked<LoteProductoTerminadoRepository>;

  const createMany = jest.fn();
  const movimientoProductoTerminadoRepository = {
    createMany,
  } as unknown as jest.Mocked<MovimientoProductoTerminadoRepository>;

  const useCase = new RegistrarSalidaProductoTerminadoUseCase(
    movimientoProductoTerminadoRepository,
    loteProductoTerminadoRepository,
    productoTerminadoRepository,
  );

  const fecha = new Date('2026-10-01T00:00:00.000Z');
  const productoTerminadoActivo = new ProductoTerminadoEntity(
    1,
    10,
    'DEMO-MOV-PT-001',
    10,
    'Chifles clásicos',
    1,
    'Chifles',
    1,
    250,
    UnidadMedidaPresentacion.GR,
    true,
    160,
    50,
    500,
    fecha,
    fecha,
  );

  const loteA = new LoteProductoTerminadoEntity(
    10,
    1,
    'DEMO-MOV-PT-001',
    10,
    'Chifles clásicos',
    1,
    'Chifles',
    1,
    250,
    UnidadMedidaPresentacion.GR,
    'LOTE-A',
    fecha,
    new Date('2026-10-20T00:00:00.000Z'),
    60,
    60,
    EstadoLoteProductoTerminado.ACTIVO,
    true,
    fecha,
    fecha,
  );
  const loteB = new LoteProductoTerminadoEntity(
    11,
    1,
    'DEMO-MOV-PT-001',
    10,
    'Chifles clásicos',
    1,
    'Chifles',
    1,
    250,
    UnidadMedidaPresentacion.GR,
    'LOTE-B',
    fecha,
    new Date('2026-11-06T00:00:00.000Z'),
    100,
    100,
    EstadoLoteProductoTerminado.ACTIVO,
    true,
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findByIdProductoTerminado.mockResolvedValue(productoTerminadoActivo);
    findDisponiblesParaSalida.mockResolvedValue([loteA, loteB]);
    createMany.mockImplementation((params: object[]) =>
      Promise.resolve(params),
    );
  });

  it('lanza 404 si el producto terminado no existe', async () => {
    findByIdProductoTerminado.mockResolvedValue(null);

    await expect(
      useCase.execute({
        producto_terminado_id: 99,
        cantidad: 10,
        razon: 'Venta',
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('lanza 409 si el producto no está activo', async () => {
    findByIdProductoTerminado.mockResolvedValue({
      ...productoTerminadoActivo,
      estado: false,
    });

    await expect(
      useCase.execute({
        producto_terminado_id: 1,
        cantidad: 10,
        razon: 'Venta',
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('lanza 409 si el stock disponible no alcanza', async () => {
    await expect(
      useCase.execute({
        producto_terminado_id: 1,
        cantidad: 999,
        razon: 'Venta',
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('toma todo de un solo lote cuando alcanza', async () => {
    await useCase.execute({
      producto_terminado_id: 1,
      cantidad: 30,
      razon: 'Venta',
    });

    expect(createMany).toHaveBeenCalledWith([
      {
        lote_producto_terminado_id: 10,
        tipo: 'salida',
        cantidad: 30,
        razon: 'Venta',
      },
    ]);
  });

  it('reparte FEFO entre varios lotes cuando el primero no alcanza', async () => {
    await useCase.execute({
      producto_terminado_id: 1,
      cantidad: 150,
      razon: 'Venta',
    });

    expect(createMany).toHaveBeenCalledWith([
      {
        lote_producto_terminado_id: 10,
        tipo: 'salida',
        cantidad: 60,
        razon: 'Venta',
      },
      {
        lote_producto_terminado_id: 11,
        tipo: 'salida',
        cantidad: 90,
        razon: 'Venta',
      },
    ]);
  });

  describe('executeMany', () => {
    it('junta varias filas del mismo producto en una sola llamada a createMany', async () => {
      await useCase.executeMany([
        { producto_terminado_id: 1, cantidad: 20, razon: 'Fila 1' },
        { producto_terminado_id: 1, cantidad: 30, razon: 'Fila 2' },
      ]);

      // loteA (60) cubre la fila 1 completa; sigue repartiendo FEFO sobre lo
      // que le queda a loteA (40) para la fila 2, sin volver a contar lo ya
      // reservado por la fila 1.
      expect(createMany).toHaveBeenCalledWith([
        {
          lote_producto_terminado_id: 10,
          tipo: 'salida',
          cantidad: 20,
          razon: 'Fila 1',
        },
        {
          lote_producto_terminado_id: 10,
          tipo: 'salida',
          cantidad: 30,
          razon: 'Fila 2',
        },
      ]);
    });

    it('no deja que una fila posterior pise el saldo ya reservado por otra', async () => {
      // loteA tiene 60: la fila 1 se lo lleva entero; la fila 2 debe repartir
      // desde loteB, no volver a leer los 60 originales de loteA.
      await useCase.executeMany([
        { producto_terminado_id: 1, cantidad: 60, razon: 'Fila 1' },
        { producto_terminado_id: 1, cantidad: 50, razon: 'Fila 2' },
      ]);

      expect(createMany).toHaveBeenCalledWith([
        {
          lote_producto_terminado_id: 10,
          tipo: 'salida',
          cantidad: 60,
          razon: 'Fila 1',
        },
        {
          lote_producto_terminado_id: 11,
          tipo: 'salida',
          cantidad: 50,
          razon: 'Fila 2',
        },
      ]);
    });

    it('lanza 409 si, descontando lo ya reservado, el stock no alcanza', async () => {
      await expect(
        useCase.executeMany([
          { producto_terminado_id: 1, cantidad: 60, razon: 'Fila 1' },
          { producto_terminado_id: 1, cantidad: 999, razon: 'Fila 2' },
        ]),
      ).rejects.toBeInstanceOf(ResourceConflictError);

      expect(createMany).not.toHaveBeenCalled();
    });
  });
});
