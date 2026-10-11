import { ProductoPresentacionEntity } from '../../../domain/entities/producto_presentacion.entity';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';
import { UpdateProductoPresentacionDto } from '../../dto/producto_presentacion-dtos/update-producto_presentacion.dto';
import { UpdateProductoPresentacionUseCase } from './update-producto_presentacion.use-case';

// `@IsOptional()` deja pasar `null` (así se quita el mayorista), pero el tipo del
// DTO solo declara `number | undefined`.
const dto = (valores: object) => valores as UpdateProductoPresentacionDto;

describe('UpdateProductoPresentacionUseCase', () => {
  const findById = jest.fn();
  const update = jest.fn();

  const useCase = new UpdateProductoPresentacionUseCase({
    findById,
    update,
  } as unknown as ProductoPresentacionRepository);

  const fecha = new Date('2026-10-01T00:00:00.000Z');
  const presentacion = (
    precioMayorista: number | null,
    umbralMayorista: number | null,
  ) =>
    new ProductoPresentacionEntity(
      7,
      'FR-P1-PR2',
      10,
      precioMayorista,
      umbralMayorista,
      1,
      2,
      null,
      'chifles-p2',
      true,
      fecha,
      fecha,
    );

  beforeEach(() => {
    jest.resetAllMocks();
    findById.mockResolvedValue(presentacion(8, 6));
    update.mockImplementation((_id: number, params: object) =>
      Promise.resolve({ ...presentacion(8, 6), ...params }),
    );
  });

  it('lanza 404 si la presentación no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(useCase.execute(99, { precio_unitario: 12 })).rejects.toThrow(
      ResourceNotFoundError,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('solo envía precios y umbral; ni el SKU, ni el slug, ni la imagen se editan por aquí', async () => {
    await useCase.execute(7, { precio_unitario: 12 });

    expect(update).toHaveBeenCalledWith(7, {
      precio_unitario: 12,
      precio_mayorista: undefined,
      umbral_mayorista: undefined,
    });
  });

  it('acepta quitar el precio mayorista junto con su umbral', async () => {
    await useCase.execute(
      7,
      dto({ precio_mayorista: null, umbral_mayorista: null }),
    );

    expect(update).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        precio_mayorista: null,
        umbral_mayorista: null,
      }),
    );
  });

  it('lanza 409 si el nuevo precio unitario deja al mayorista igual o mayor', async () => {
    await expect(useCase.execute(7, { precio_unitario: 8 })).rejects.toThrow(
      new ResourceConflictError(
        'El precio mayorista debe ser menor que el precio unitario',
      ),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 409 si el precio mayorista no es menor que el unitario', async () => {
    await expect(
      useCase.execute(7, { precio_mayorista: 10, umbral_mayorista: 6 }),
    ).rejects.toThrow(ResourceConflictError);
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 409 si se quita el precio mayorista pero se conserva el umbral', async () => {
    await expect(
      useCase.execute(7, dto({ precio_mayorista: null })),
    ).rejects.toThrow(
      new ResourceConflictError(
        'El precio mayorista y el umbral mayorista deben enviarse juntos',
      ),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('permite agregar mayorista a una presentación que no lo tenía', async () => {
    findById.mockResolvedValue(presentacion(null, null));

    await useCase.execute(7, { precio_mayorista: 7, umbral_mayorista: 12 });

    expect(update).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ precio_mayorista: 7, umbral_mayorista: 12 }),
    );
  });
});
