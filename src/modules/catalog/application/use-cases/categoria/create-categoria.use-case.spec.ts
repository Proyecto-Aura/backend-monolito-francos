import { ResourceConflictError } from '../../../domain/errors/catalog-domain.errors';
import { CategoriaRepository } from '../../../domain/repositories/categoria.repository';
import { CreateCategoriaUseCase } from './create-categoria.use-case';

describe('CreateCategoriaUseCase', () => {
  const existsByName = jest.fn();
  const create = jest.fn();
  const categoriaRepository = {
    existsByName,
    create,
  } as unknown as jest.Mocked<CategoriaRepository>;
  const useCase = new CreateCategoriaUseCase(categoriaRepository);

  beforeEach(() => {
    jest.clearAllMocks();
    existsByName.mockResolvedValue(false);
    create.mockImplementation((params: object) => Promise.resolve(params));
  });

  it('crea una categoría activa con nombre y descripción', async () => {
    await useCase.execute({
      nombre: 'Chifles',
      descripcion: 'Hojuelas de plátano bellaco.',
    });

    expect(create).toHaveBeenCalledWith({
      nombre: 'Chifles',
      descripcion: 'Hojuelas de plátano bellaco.',
      estado: true,
    });
  });

  it('normaliza el nombre y la descripción (sin espacios de más)', async () => {
    await useCase.execute({
      nombre: '  Canchita   y  maíz ',
      descripcion: '  Maíz   tostado. ',
    });

    expect(existsByName).toHaveBeenCalledWith('Canchita y maíz');
    expect(create).toHaveBeenCalledWith({
      nombre: 'Canchita y maíz',
      descripcion: 'Maíz tostado.',
      estado: true,
    });
  });

  it('respeta el estado enviado', async () => {
    await useCase.execute({
      nombre: 'Temporada',
      descripcion: 'Líneas estacionales.',
      estado: false,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ estado: false }),
    );
  });

  it('lanza 409 si ya existe una categoría con ese nombre y no crea nada', async () => {
    existsByName.mockResolvedValue(true);

    await expect(
      useCase.execute({ nombre: 'Chifles', descripcion: 'x' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(create).not.toHaveBeenCalled();
  });
});
