import { CategoriaEntity } from '../../../domain/entities/categoria.entity';
import { ProductoEntity } from '../../../domain/entities/producto.entity';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { CategoriaRepository } from '../../../domain/repositories/categoria.repository';
import { ProductoRepository } from '../../../domain/repositories/producto.repository';
import { UpdateProductoUseCase } from './update-producto.use-case';

describe('UpdateProductoUseCase', () => {
  const findById = jest.fn();
  const existsByName = jest.fn();
  const update = jest.fn();
  const findCategoriaById = jest.fn();

  const useCase = new UpdateProductoUseCase(
    { findById, existsByName, update } as unknown as ProductoRepository,
    { findById: findCategoriaById } as unknown as CategoriaRepository,
  );

  const fecha = new Date('2026-10-01T00:00:00.000Z');
  const producto = new ProductoEntity(
    5,
    1,
    'Chifles Clásicos',
    'Plátano en hojuelas',
    true,
    false,
    fecha,
    fecha,
  );
  const categoria = (id: number, estado: boolean) =>
    new CategoriaEntity(id, `Categoría ${id}`, null, estado, fecha, fecha);

  beforeEach(() => {
    jest.resetAllMocks();
    findById.mockResolvedValue(producto);
    existsByName.mockResolvedValue(false);
    update.mockImplementation((_id: number, params: object) =>
      Promise.resolve({ ...producto, ...params }),
    );
  });

  it('lanza 404 si el producto no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(useCase.execute(99, { nombre: 'Otro' })).rejects.toThrow(
      ResourceNotFoundError,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('normaliza los espacios del nombre y solo envía los campos que cambian', async () => {
    await useCase.execute(5, { nombre: '  Chifles   Picantes ' });

    expect(existsByName).toHaveBeenCalledWith('Chifles Picantes', 5);
    expect(update).toHaveBeenCalledWith(5, {
      nombre: 'Chifles Picantes',
      categoria_id: undefined,
      descripcion: undefined,
      destacado: undefined,
    });
  });

  it('lanza 409 si otro producto ya tiene ese nombre', async () => {
    existsByName.mockResolvedValue(true);

    await expect(useCase.execute(5, { nombre: 'Papas' })).rejects.toThrow(
      new ResourceConflictError(
        'Ya existe otro producto registrado con ese nombre',
      ),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('no revisa el nombre repetido si solo cambian las mayúsculas del propio nombre', async () => {
    await useCase.execute(5, { nombre: 'chifles clásicos' });

    expect(existsByName).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
  });

  it('acepta cambiar a una categoría activa', async () => {
    findCategoriaById.mockResolvedValue(categoria(2, true));

    await useCase.execute(5, { categoria_id: 2 });

    expect(findCategoriaById).toHaveBeenCalledWith(2);
    expect(update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ categoria_id: 2 }),
    );
  });

  it('lanza 404 si la nueva categoría no existe', async () => {
    findCategoriaById.mockResolvedValue(null);

    await expect(useCase.execute(5, { categoria_id: 99 })).rejects.toThrow(
      new ResourceNotFoundError('Categoría no encontrada'),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('lanza 409 si la nueva categoría está inactiva', async () => {
    findCategoriaById.mockResolvedValue(categoria(3, false));

    await expect(useCase.execute(5, { categoria_id: 3 })).rejects.toThrow(
      new ResourceConflictError('La categoría no está activa'),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('no consulta la categoría si sigue siendo la misma', async () => {
    await useCase.execute(5, { categoria_id: 1, destacado: true });

    expect(findCategoriaById).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ destacado: true }),
    );
  });
});
