import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { RutaEntity } from '../../../domain/entities/ruta.entity';
import { RutaRepository } from '../../../domain/repositories/ruta.repository';
import { CreateRutaUseCase } from './create-ruta.use-case';

describe('CreateRutaUseCase', () => {
  const create = jest.fn();
  const existsByName = jest.fn();
  const findById = jest.fn();
  const repository = {
    create,
    existsByName,
    findById,
  } as unknown as jest.Mocked<RutaRepository>;
  const useCase = new CreateRutaUseCase(repository);

  const ruta = new RutaEntity(
    1,
    'insumos',
    'Insumos',
    'box',
    null,
    true,
    null,
    new Date('2026-01-01T00:00:00.000Z'),
    new Date('2026-01-01T00:00:00.000Z'),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('crea una ruta raiz con etiqueta e icono', async () => {
    existsByName.mockResolvedValue(false);
    create.mockResolvedValue(ruta);

    await expect(
      useCase.execute({ nombre: 'insumos', etiqueta: 'Insumos', icono: 'box' }),
    ).resolves.toBe(ruta);

    expect(create).toHaveBeenCalledWith({
      nombre: 'insumos',
      etiqueta: 'Insumos',
      icono: 'box',
      descripcion: null,
      estado: true,
      parent_id: null,
    });
  });

  it('crea una ruta hija cuando el padre existe y esta activo', async () => {
    existsByName.mockResolvedValue(false);
    findById.mockResolvedValue({ ...ruta, estado: true });
    create.mockResolvedValue(ruta);

    await useCase.execute({
      nombre: 'stock-insumos',
      etiqueta: 'Stock de insumos',
      icono: 'boxes',
      parent_id: 1,
    });

    expect(findById).toHaveBeenCalledWith(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ parent_id: 1 }),
    );
  });

  it('lanza 409 si ya existe una ruta con ese nombre', async () => {
    existsByName.mockResolvedValue(true);

    await expect(
      useCase.execute({ nombre: 'insumos', etiqueta: 'Insumos', icono: 'box' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 404 si la ruta padre no existe', async () => {
    existsByName.mockResolvedValue(false);
    findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        nombre: 'stock-insumos',
        etiqueta: 'Stock de insumos',
        icono: 'boxes',
        parent_id: 99,
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);

    expect(create).not.toHaveBeenCalled();
  });

  it('lanza 404 si la ruta padre existe pero esta inactiva', async () => {
    existsByName.mockResolvedValue(false);
    findById.mockResolvedValue({ ...ruta, estado: false });

    await expect(
      useCase.execute({
        nombre: 'stock-insumos',
        etiqueta: 'Stock de insumos',
        icono: 'boxes',
        parent_id: 1,
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);

    expect(create).not.toHaveBeenCalled();
  });
});
