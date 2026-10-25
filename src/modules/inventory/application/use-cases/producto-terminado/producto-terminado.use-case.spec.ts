import { ProductoTerminadoEntity } from '../../../domain/entities';
import { UnidadMedidaPresentacion } from '../../../../catalog/domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { ProductoTerminadoRepository } from '../../../domain/repositories/producto-terminado.repository';
import { UpdateProductoTerminadoUseCase } from './update-producto-terminado.use-case';

describe('UpdateProductoTerminadoUseCase', () => {
  const findByProductoPresentacionId = jest.fn();
  const updateByProductoPresentacionId = jest.fn();
  const existeProductoPresentacion = jest.fn();
  const productoTerminadoRepository = {
    findByProductoPresentacionId,
    updateByProductoPresentacionId,
    existeProductoPresentacion,
  } as unknown as jest.Mocked<ProductoTerminadoRepository>;

  const useCase = new UpdateProductoTerminadoUseCase(
    productoTerminadoRepository,
  );

  const fecha = new Date('2026-10-25T00:00:00.000Z');
  const productoTerminado = new ProductoTerminadoEntity(
    1,
    12,
    'FR-PRES-012',
    4,
    'Pan de molde',
    2,
    'Panadería',
    7,
    500,
    UnidadMedidaPresentacion.GR,
    20,
    10,
    100,
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lanza 404 si la producto-presentación no existe', async () => {
    existeProductoPresentacion.mockResolvedValue(false);

    await expect(
      useCase.execute(99, { stock_minimo: 5 }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(updateByProductoPresentacionId).not.toHaveBeenCalled();
  });

  it('lanza 409 si el nuevo rango es inválido contra el stock_maximo actual', async () => {
    existeProductoPresentacion.mockResolvedValue(true);
    findByProductoPresentacionId.mockResolvedValue(productoTerminado);

    await expect(
      useCase.execute(12, { stock_minimo: 500 }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(updateByProductoPresentacionId).not.toHaveBeenCalled();
  });

  it('actualiza stock_minimo y stock_maximo', async () => {
    existeProductoPresentacion.mockResolvedValue(true);
    findByProductoPresentacionId.mockResolvedValue(productoTerminado);
    updateByProductoPresentacionId.mockResolvedValue({
      ...productoTerminado,
      stock_minimo: 15,
      stock_maximo: 300,
    });

    await useCase.execute(12, { stock_minimo: 15, stock_maximo: 300 });

    expect(updateByProductoPresentacionId).toHaveBeenCalledWith(12, {
      stock_minimo: 15,
      stock_maximo: 300,
    });
  });

  it('crea la fila sobre la marcha (self-heal) si la presentación no tenía stock todavía', async () => {
    // Caso raro: producto_presentacion existe pero nunca tuvo fila de
    // producto_terminado (dato de antes de que existiera la tabla).
    existeProductoPresentacion.mockResolvedValue(true);
    findByProductoPresentacionId.mockResolvedValue(null);
    updateByProductoPresentacionId.mockResolvedValue(productoTerminado);

    await useCase.execute(12, { stock_minimo: 20 });

    expect(updateByProductoPresentacionId).toHaveBeenCalledWith(12, {
      stock_minimo: 20,
      stock_maximo: undefined,
    });
  });
});
