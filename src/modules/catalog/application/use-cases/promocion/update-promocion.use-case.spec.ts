import { PromocionEntity } from '../../../domain/entities';
import { TipoPromocion } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { PromocionRepository } from '../../../domain/repositories/promocion.repository';
import { UpdatePromocionUseCase } from './update-promocion.use-case';

describe('UpdatePromocionUseCase', () => {
  const findById = jest.fn();
  const existsOverlap = jest.fn();
  const update = jest.fn();

  const promocionRepository = {
    findById,
    existsOverlap,
    update,
  } as unknown as jest.Mocked<PromocionRepository>;

  const useCase = new UpdatePromocionUseCase(promocionRepository);

  const makePromocion = (overrides: Partial<PromocionEntity> = {}) =>
    Object.assign(
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
        true,
        new Date('2026-09-01T00:00:00.000Z'),
        new Date('2026-09-01T00:00:00.000Z'),
      ),
      overrides,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    findById.mockResolvedValue(makePromocion());
    existsOverlap.mockResolvedValue(false);
    update.mockImplementation((_id: number, params: object) =>
      Promise.resolve(params),
    );
  });

  it('lanza 404 si la promoción no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(useCase.execute(1, { valor: 20 })).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('actualiza solo los campos enviados', async () => {
    await useCase.execute(1, { fecha_fin: '2026-11-15' });

    expect(update).toHaveBeenCalledWith(1, {
      fecha_fin: new Date('2026-11-15T00:00:00.000Z'),
    });
  });

  it('regenera el nombre por defecto cuando cambia el porcentaje', async () => {
    await useCase.execute(1, { valor: 25 });

    expect(update).toHaveBeenCalledWith(1, {
      valor: 25,
      nombre: 'Descuento 25%',
    });
  });

  it('conserva un nombre personalizado aunque cambie el porcentaje', async () => {
    findById.mockResolvedValue(makePromocion({ nombre: 'Promo de octubre' }));

    await useCase.execute(1, { valor: 25 });

    expect(update).toHaveBeenCalledWith(1, { valor: 25 });
  });

  it('usa el nombre enviado, sin espacios de más', async () => {
    await useCase.execute(1, { nombre: '  Fiestas   Patrias ' });

    expect(update).toHaveBeenCalledWith(1, { nombre: 'Fiestas Patrias' });
  });

  it('valida el rango con las fechas ya guardadas: 409 si el nuevo fin queda antes del inicio', async () => {
    await expect(
      useCase.execute(1, { fecha_fin: '2026-09-30' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(update).not.toHaveBeenCalled();
  });

  it('al cambiar fechas revisa cruces sin contarse a sí misma', async () => {
    await useCase.execute(1, { fecha_fin: '2026-11-15' });

    expect(existsOverlap).toHaveBeenCalledWith({
      producto_presentacion_id: 10,
      fecha_inicio: new Date('2026-10-01T00:00:00.000Z'),
      fecha_fin: new Date('2026-11-15T00:00:00.000Z'),
      excludeId: 1,
    });
  });

  it('lanza 409 si las nuevas fechas se cruzan con otra promoción activa', async () => {
    existsOverlap.mockResolvedValue(true);

    await expect(
      useCase.execute(1, { fecha_fin: '2026-11-15' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(update).not.toHaveBeenCalled();
  });

  it('no revisa cruces si no cambian las fechas', async () => {
    await useCase.execute(1, { valor: 30 });

    expect(existsOverlap).not.toHaveBeenCalled();
  });

  it('no revisa cruces si la promoción está desactivada', async () => {
    findById.mockResolvedValue(makePromocion({ estado: false }));

    await useCase.execute(1, { fecha_fin: '2026-11-15' });

    expect(existsOverlap).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
  });
});
