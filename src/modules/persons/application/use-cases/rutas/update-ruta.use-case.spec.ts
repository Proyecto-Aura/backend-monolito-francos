import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { RutaEntity } from '../../../domain/entities/ruta.entity';
import { RutaRepository } from '../../../domain/repositories/ruta.repository';
import { UpdateRutaUseCase } from './update-ruta.use-case';

describe('UpdateRutaUseCase', () => {
  const update = jest.fn();
  const existsByName = jest.fn();
  const findById = jest.fn();
  const repository = {
    update,
    existsByName,
    findById,
  } as unknown as jest.Mocked<RutaRepository>;
  const useCase = new UpdateRutaUseCase(repository);

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

  it('actualiza etiqueta e icono sin chequear duplicados cuando el nombre no cambia', async () => {
    findById.mockResolvedValue(ruta);
    update.mockResolvedValue(ruta);

    await useCase.execute(1, {
      etiqueta: 'Insumos y materiales',
      icono: 'boxes',
    });

    expect(existsByName).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(1, {
      nombre: undefined,
      etiqueta: 'Insumos y materiales',
      icono: 'boxes',
      descripcion: undefined,
    });
  });

  it('valida duplicados cuando el nombre si cambia', async () => {
    findById.mockResolvedValue(ruta);
    existsByName.mockResolvedValue(false);
    update.mockResolvedValue(ruta);

    await useCase.execute(1, { nombre: 'insumos-nuevo' });

    expect(existsByName).toHaveBeenCalledWith('insumos-nuevo', 1);
    expect(update).toHaveBeenCalled();
  });

  it('lanza 404 si la ruta no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(
      useCase.execute(99, { etiqueta: 'Nueva etiqueta' }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);

    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 409 si el nuevo nombre ya esta en uso por otra ruta', async () => {
    findById.mockResolvedValue(ruta);
    existsByName.mockResolvedValue(true);

    await expect(
      useCase.execute(1, { nombre: 'catalogo' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);

    expect(update).not.toHaveBeenCalled();
  });
});
