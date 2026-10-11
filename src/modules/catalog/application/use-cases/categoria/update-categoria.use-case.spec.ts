import { CategoriaEntity } from '../../../domain/entities';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { CategoriaRepository } from '../../../domain/repositories/categoria.repository';
import { UpdateCategoriaUseCase } from './update-categoria.use-case';

describe('UpdateCategoriaUseCase', () => {
  const findById = jest.fn();
  const existsByName = jest.fn();
  const update = jest.fn();
  const categoriaRepository = {
    findById,
    existsByName,
    update,
  } as unknown as jest.Mocked<CategoriaRepository>;
  const useCase = new UpdateCategoriaUseCase(categoriaRepository);

  const fecha = new Date('2026-10-01T00:00:00.000Z');
  const categoria = new CategoriaEntity(
    1,
    'Chifles',
    'Hojuelas de plátano.',
    true,
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findById.mockResolvedValue(categoria);
    existsByName.mockResolvedValue(false);
    update.mockImplementation((_id: number, params: object) =>
      Promise.resolve(params),
    );
  });

  it('lanza 404 si la categoría no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(useCase.execute(1, { nombre: 'X' })).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('actualiza nombre y descripción normalizados', async () => {
    await useCase.execute(1, {
      nombre: '  Chifles   y más ',
      descripcion: '  Nueva   descripción. ',
    });

    expect(existsByName).toHaveBeenCalledWith('Chifles y más', 1);
    expect(update).toHaveBeenCalledWith(1, {
      nombre: 'Chifles y más',
      descripcion: 'Nueva descripción.',
    });
  });

  it('actualiza solo la descripción sin tocar el nombre', async () => {
    await useCase.execute(1, { descripcion: 'Otra descripción.' });

    expect(existsByName).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(1, {
      nombre: undefined,
      descripcion: 'Otra descripción.',
    });
  });

  it('no revisa duplicados si solo cambian las mayúsculas del mismo nombre', async () => {
    await useCase.execute(1, { nombre: 'CHIFLES' });

    expect(existsByName).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ nombre: 'CHIFLES' }),
    );
  });

  it('lanza 409 si otra categoría ya tiene ese nombre', async () => {
    existsByName.mockResolvedValue(true);

    await expect(
      useCase.execute(1, { nombre: 'Camote' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(update).not.toHaveBeenCalled();
  });
});
