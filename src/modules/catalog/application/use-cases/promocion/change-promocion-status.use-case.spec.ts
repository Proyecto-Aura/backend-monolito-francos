import {
  ProductoPresentacionEntity,
  PromocionEntity,
} from '../../../domain/entities';
import { TipoPromocion } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';
import { PromocionRepository } from '../../../domain/repositories/promocion.repository';
import { ChangePromocionStatusUseCase } from './change-promocion-status.use-case';

describe('ChangePromocionStatusUseCase', () => {
  const findPromocionById = jest.fn();
  const existsOverlap = jest.fn();
  const setStatus = jest.fn();
  const findProductoPresentacionById = jest.fn();

  const promocionRepository = {
    findById: findPromocionById,
    existsOverlap,
    setStatus,
  } as unknown as jest.Mocked<PromocionRepository>;
  const productoPresentacionRepository = {
    findById: findProductoPresentacionById,
  } as unknown as jest.Mocked<ProductoPresentacionRepository>;

  const useCase = new ChangePromocionStatusUseCase(
    promocionRepository,
    productoPresentacionRepository,
  );

  const makePromocion = (estado: boolean) =>
    new PromocionEntity(
      1,
      10,
      'Descuento 10%',
      TipoPromocion.PORCENTAJE,
      10,
      null,
      null,
      null,
      null,
      new Date('2026-10-01T00:00:00.000Z'),
      new Date('2026-10-31T00:00:00.000Z'),
      estado,
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-09-01T00:00:00.000Z'),
    );

  const makeProductoPresentacion = (estado: boolean) =>
    new ProductoPresentacionEntity(
      10,
      'FR-P1-PR1',
      10,
      8,
      12,
      1,
      1,
      null,
      null,
      estado,
      new Date('2026-10-01T00:00:00.000Z'),
      new Date('2026-10-01T00:00:00.000Z'),
    );

  beforeEach(() => {
    jest.clearAllMocks();
    findProductoPresentacionById.mockResolvedValue(
      makeProductoPresentacion(true),
    );
    existsOverlap.mockResolvedValue(false);
    setStatus.mockImplementation((_id: number, estado: boolean) =>
      Promise.resolve({ estado }),
    );
  });

  it('lanza 404 si la promoción no existe', async () => {
    findPromocionById.mockResolvedValue(null);

    await expect(useCase.execute(1, false)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('desactiva una promoción activa sin más validaciones', async () => {
    findPromocionById.mockResolvedValue(makePromocion(true));

    await useCase.execute(1, false);

    expect(setStatus).toHaveBeenCalledWith(1, false);
    expect(existsOverlap).not.toHaveBeenCalled();
  });

  it('reactiva una promoción desactivada si no hay cruces', async () => {
    findPromocionById.mockResolvedValue(makePromocion(false));

    await useCase.execute(1, true);

    expect(existsOverlap).toHaveBeenCalledWith({
      producto_presentacion_id: 10,
      fecha_inicio: new Date('2026-10-01T00:00:00.000Z'),
      fecha_fin: new Date('2026-10-31T00:00:00.000Z'),
      excludeId: 1,
    });
    expect(setStatus).toHaveBeenCalledWith(1, true);
  });

  it('lanza 409 al reactivar si la presentación del producto está inactiva', async () => {
    findPromocionById.mockResolvedValue(makePromocion(false));
    findProductoPresentacionById.mockResolvedValue(
      makeProductoPresentacion(false),
    );

    await expect(useCase.execute(1, true)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('lanza 409 al reactivar si se cruza con otra promoción activa', async () => {
    findPromocionById.mockResolvedValue(makePromocion(false));
    existsOverlap.mockResolvedValue(true);

    await expect(useCase.execute(1, true)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('no hace nada si ya está en el estado pedido', async () => {
    const activa = makePromocion(true);
    findPromocionById.mockResolvedValue(activa);

    await expect(useCase.execute(1, true)).resolves.toBe(activa);
    expect(setStatus).not.toHaveBeenCalled();
  });
});
