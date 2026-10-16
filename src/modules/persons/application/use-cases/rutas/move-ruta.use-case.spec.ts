import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { RutaEntity } from '../../../domain/entities/ruta.entity';
import { RutaRepository } from '../../../domain/repositories/ruta.repository';
import { MoveRutaUseCase } from './move-ruta.use-case';

describe('MoveRutaUseCase', () => {
  const findById = jest.fn();
  const move = jest.fn();
  const repository = {
    findById,
    move,
  } as unknown as jest.Mocked<RutaRepository>;
  const useCase = new MoveRutaUseCase(repository);

  const fecha = new Date('2026-01-01T00:00:00.000Z');
  const ruta = (id: number, parent_id: number | null, estado = true) =>
    new RutaEntity(
      id,
      `ruta-${id}`,
      `Ruta ${id}`,
      'icono',
      null,
      estado,
      parent_id,
      fecha,
      fecha,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mueve una ruta a un padre nuevo valido', async () => {
    findById.mockImplementation((id: number) =>
      id === 1 ? ruta(1, null) : ruta(2, null, true),
    );
    move.mockResolvedValue(ruta(1, 2));

    await useCase.execute(1, { parent_id: 2 });

    expect(move).toHaveBeenCalledWith(1, { parent_id: 2 });
  });

  it('mueve una ruta a raiz con parent_id null', async () => {
    findById.mockResolvedValue(ruta(1, 3));
    move.mockResolvedValue(ruta(1, null));

    await useCase.execute(1, { parent_id: null });

    expect(move).toHaveBeenCalledWith(1, { parent_id: null });
  });

  it('lanza 404 si la ruta a mover no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(
      useCase.execute(99, { parent_id: null }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(move).not.toHaveBeenCalled();
  });

  it('lanza 409 si una ruta intenta ser su propio padre', async () => {
    findById.mockResolvedValue(ruta(1, null));

    await expect(useCase.execute(1, { parent_id: 1 })).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(move).not.toHaveBeenCalled();
  });

  it('lanza 404 si el padre destino no existe o esta inactivo', async () => {
    findById.mockImplementation((id: number) =>
      id === 1 ? ruta(1, null) : null,
    );

    await expect(useCase.execute(1, { parent_id: 99 })).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(move).not.toHaveBeenCalled();
  });

  it('lanza 409 si el padre destino es uno de sus propios descendientes (ciclo)', async () => {
    const fixtures: Record<number, RutaEntity> = {
      1: ruta(1, null),
      2: ruta(2, 1),
      3: ruta(3, 2),
    };
    findById.mockImplementation((id: number) => fixtures[id] ?? null);

    await expect(useCase.execute(1, { parent_id: 3 })).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(move).not.toHaveBeenCalled();
  });
});
