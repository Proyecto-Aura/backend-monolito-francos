import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { EmpresaEntity } from '../../../domain/entities/empresa.entity';
import { EmpresaRepository } from '../../../domain/repositories/empresa.repository';
import { ChangeEmpresaStatusUseCase } from './change-empresa-status.use-case';

describe('ChangeEmpresaStatusUseCase', () => {
  const findById = jest.fn();
  const setStatus = jest.fn();
  const repository = {
    findById,
    setStatus,
  } as unknown as jest.Mocked<EmpresaRepository>;
  const useCase = new ChangeEmpresaStatusUseCase(repository);

  const fecha = new Date('2026-01-01T00:00:00.000Z');
  const empresa = (id: number, es_emisora: boolean, estado = true) =>
    new EmpresaEntity(
      id,
      `Empresa ${id}`,
      '20123456789',
      'Av. Siempre Viva 123',
      null,
      null,
      null,
      estado,
      es_emisora,
      fecha,
      fecha,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lanza 409 al desactivar la empresa emisora', async () => {
    findById.mockResolvedValue(empresa(1, true));

    await expect(useCase.execute(1, false)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('desactiva una empresa que no es emisora', async () => {
    findById.mockResolvedValue(empresa(2, false));
    setStatus.mockResolvedValue(empresa(2, false, false));

    await useCase.execute(2, false);

    expect(setStatus).toHaveBeenCalledWith(2, false);
  });

  it('permite activar la empresa emisora', async () => {
    findById.mockResolvedValue(empresa(1, true, false));
    setStatus.mockResolvedValue(empresa(1, true, true));

    await useCase.execute(1, true);

    expect(setStatus).toHaveBeenCalledWith(1, true);
  });

  it('lanza 404 si la empresa no existe', async () => {
    findById.mockResolvedValue(null);

    await expect(useCase.execute(99, false)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(setStatus).not.toHaveBeenCalled();
  });
});
