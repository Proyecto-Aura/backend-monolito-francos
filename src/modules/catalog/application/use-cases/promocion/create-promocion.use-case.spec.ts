import { TipoPromocion } from '../../../domain/enums';
import { ProductoPresentacionEntity } from '../../../domain/entities';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';
import { PromocionRepository } from '../../../domain/repositories/promocion.repository';
import { CreatePromocionUseCase } from './create-promocion.use-case';

describe('CreatePromocionUseCase', () => {
  const findById = jest.fn();
  const existsOverlap = jest.fn();
  const create = jest.fn();

  const productoPresentacionRepository = {
    findById,
  } as unknown as jest.Mocked<ProductoPresentacionRepository>;
  const promocionRepository = {
    existsOverlap,
    create,
  } as unknown as jest.Mocked<PromocionRepository>;

  const useCase = new CreatePromocionUseCase(
    promocionRepository,
    productoPresentacionRepository,
  );

  const makeProductoPresentacion = (estado = true) =>
    new ProductoPresentacionEntity(
      10,
      'FR-P1-PR1',
      10,
      8,
      12,
      1,
      1,
      null,
      'producto-100-gr-p1',
      estado,
      new Date('2026-10-01T00:00:00.000Z'),
      new Date('2026-10-01T00:00:00.000Z'),
    );

  const dto = (overrides = {}) => ({
    producto_presentacion_id: 10,
    valor: 50,
    fecha_inicio: '2026-10-01',
    fecha_fin: '2026-10-31',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    findById.mockResolvedValue(makeProductoPresentacion());
    existsOverlap.mockResolvedValue(false);
    create.mockImplementation((params: object) => Promise.resolve(params));
  });

  it('crea un descuento por porcentaje, activo, con nombre por defecto', async () => {
    await useCase.execute(dto());

    expect(create).toHaveBeenCalledWith({
      producto_presentacion_id: 10,
      nombre: 'Descuento 50%',
      tipo: TipoPromocion.PORCENTAJE,
      valor: 50,
      cantidad_paga: null,
      cantidad_lleva: null,
      cantidad_minima: null,
      producto_presentacion_regalo_id: null,
      fecha_inicio: new Date('2026-10-01T00:00:00.000Z'),
      fecha_fin: new Date('2026-10-31T00:00:00.000Z'),
      estado: true,
    });
  });

  it('usa el nombre enviado, sin espacios de más', async () => {
    await useCase.execute(dto({ nombre: '  Promo   de   octubre ' }));

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'Promo de octubre' }),
    );
  });

  it('permite una promoción de un solo día', async () => {
    await expect(
      useCase.execute(
        dto({ fecha_inicio: '2026-10-05', fecha_fin: '2026-10-05' }),
      ),
    ).resolves.toBeDefined();
  });

  it('lanza 404 si la presentación del producto no existe y no crea nada', async () => {
    findById.mockResolvedValue(null);

    await expect(useCase.execute(dto())).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si la presentación del producto está inactiva', async () => {
    findById.mockResolvedValue(makeProductoPresentacion(false));

    await expect(useCase.execute(dto())).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si la fecha fin es anterior a la de inicio', async () => {
    await expect(
      useCase.execute(
        dto({ fecha_inicio: '2026-10-10', fecha_fin: '2026-10-09' }),
      ),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 409 si se cruza con otra promoción activa de la misma presentación', async () => {
    existsOverlap.mockResolvedValue(true);

    await expect(useCase.execute(dto())).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(existsOverlap).toHaveBeenCalledWith({
      producto_presentacion_id: 10,
      fecha_inicio: new Date('2026-10-01T00:00:00.000Z'),
      fecha_fin: new Date('2026-10-31T00:00:00.000Z'),
    });
    expect(create).not.toHaveBeenCalled();
  });
});
