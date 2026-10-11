import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { RutaEntity } from '../../../domain/entities/ruta.entity';
import { RutaRepository } from '../../../domain/repositories/ruta.repository';
import { ChangeRutaStatusUseCase } from './change-ruta-status.use-case';

describe('ChangeRutaStatusUseCase', () => {
  const findById = jest.fn();
  const hasActiveChildren = jest.fn();
  const setStatus = jest.fn();
  const repository = {
    findById,
    hasActiveChildren,
    setStatus,
  } as unknown as jest.Mocked<RutaRepository>;
  const useCase = new ChangeRutaStatusUseCase(repository);

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

  it('desactiva una ruta sin hijos activos', async () => {
    findById.mockResolvedValue(ruta(1, null));
    hasActiveChildren.mockResolvedValue(false);
    setStatus.mockResolvedValue(ruta(1, null, false));

    await useCase.execute(1, false);

    expect(setStatus).toHaveBeenCalledWith(1, false);
  });

  it('lanza 409 al desactivar una ruta con hijos activos', async () => {
    findById.mockResolvedValue(ruta(1, null));
    hasActiveChildren.mockResolvedValue(true);

    await expect(useCase.execute(1, false)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('activa una ruta raiz sin validar padre', async () => {
    findById.mockResolvedValue(ruta(1, null, false));
    setStatus.mockResolvedValue(ruta(1, null, true));

    await useCase.execute(1, true);

    expect(setStatus).toHaveBeenCalledWith(1, true);
  });

  it('activa una ruta hija cuyo padre esta activo', async () => {
    findById.mockImplementation((id: number) =>
      id === 1 ? ruta(1, 2, false) : ruta(2, null, true),
    );
    setStatus.mockResolvedValue(ruta(1, 2, true));

    await useCase.execute(1, true);

    expect(setStatus).toHaveBeenCalledWith(1, true);
  });

  it('lanza 409 al activar una ruta cuyo padre esta inactivo', async () => {
    findById.mockImplementation((id: number) =>
      id === 1 ? ruta(1, 2, false) : ruta(2, null, false),
    );

    await expect(useCase.execute(1, true)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('lanza 404 si la ruta no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(useCase.execute(99, false)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(setStatus).not.toHaveBeenCalled();
  });
});
