import { PresentacionEntity } from '../../../domain/entities';
import { UnidadMedidaPresentacion } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { PresentacionRepository } from '../../../domain/repositories/presentacion.repository';
import { UpdatePresentacionUseCase } from './update-presentacion.use-case';

describe('UpdatePresentacionUseCase', () => {
  const findById = jest.fn();
  const existsByCantidadAndUnidadMedida = jest.fn();
  const update = jest.fn();
  const useCase = new UpdatePresentacionUseCase({
    findById,
    existsByCantidadAndUnidadMedida,
    update,
  } as unknown as PresentacionRepository);

  const fecha = new Date('2026-10-01T00:00:00.000Z');
  const presentacion = new PresentacionEntity(
    4,
    500,
    UnidadMedidaPresentacion.GR,
    'Bolsa de 500 gramos.',
    true,
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    findById.mockResolvedValue(presentacion);
    existsByCantidadAndUnidadMedida.mockResolvedValue(false);
    update.mockImplementation((_id: number, params: object) =>
      Promise.resolve({ ...presentacion, ...params }),
    );
  });

  it('lanza 404 si la presentación no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(useCase.execute(99, { descripcion: 'x' })).rejects.toThrow(
      new ResourceNotFoundError('Presentación no encontrada'),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('edita solo la descripción sin revisar duplicados', async () => {
    await useCase.execute(4, { descripcion: '  Nueva   descripción ' });

    expect(existsByCantidadAndUnidadMedida).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(4, {
      cantidad: undefined,
      unidad_medida: undefined,
      descripcion: 'Nueva descripción',
    });
  });

  it('guarda null si la descripción queda vacía y no cambia nada si no se envía', async () => {
    await useCase.execute(4, { descripcion: '   ' });
    expect(update).toHaveBeenLastCalledWith(
      4,
      expect.objectContaining({ descripcion: null }),
    );

    await useCase.execute(4, { cantidad: 500 });
    expect(update).toHaveBeenLastCalledWith(
      4,
      expect.objectContaining({ descripcion: undefined }),
    );
  });

  it('no revisa duplicados si se envía la misma cantidad y unidad que ya tiene', async () => {
    await useCase.execute(4, {
      cantidad: 500,
      unidad_medida: UnidadMedidaPresentacion.GR,
    });

    expect(existsByCantidadAndUnidadMedida).not.toHaveBeenCalled();
  });

  it('revisa duplicados, sin contarse a sí misma, al cambiar la cantidad', async () => {
    await useCase.execute(4, { cantidad: 750 });

    expect(existsByCantidadAndUnidadMedida).toHaveBeenCalledWith(750, 'gr', 4);
    expect(update).toHaveBeenCalled();
  });

  it('revisa duplicados con la unidad nueva y la cantidad que ya tenía', async () => {
    await useCase.execute(4, { unidad_medida: UnidadMedidaPresentacion.KG });

    expect(existsByCantidadAndUnidadMedida).toHaveBeenCalledWith(500, 'kg', 4);
  });

  it('lanza 409 si otra presentación ya tiene esa cantidad y unidad', async () => {
    existsByCantidadAndUnidadMedida.mockResolvedValue(true);

    await expect(useCase.execute(4, { cantidad: 250 })).rejects.toThrow(
      new ResourceConflictError(
        'Ya existe una presentación con esta cantidad y unidad de medida',
      ),
    );
    expect(update).not.toHaveBeenCalled();
  });
});
