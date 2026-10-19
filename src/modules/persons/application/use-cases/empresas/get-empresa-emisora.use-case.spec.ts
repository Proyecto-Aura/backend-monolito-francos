import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { EmpresaEntity } from '../../../domain/entities/empresa.entity';
import { EmpresaRepository } from '../../../domain/repositories/empresa.repository';
import { GetEmpresaEmisoraUseCase } from './get-empresa-emisora.use-case';

describe('GetEmpresaEmisoraUseCase', () => {
  const findEmisora = jest.fn();
  const repository = {
    findEmisora,
  } as unknown as jest.Mocked<EmpresaRepository>;
  const useCase = new GetEmpresaEmisoraUseCase(repository);

  const fecha = new Date('2026-01-01T00:00:00.000Z');
  const emisora = new EmpresaEntity(
    1,
    'Franco SAC',
    '20123456789',
    'Av. Siempre Viva 123',
    null,
    null,
    null,
    true,
    true,
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve la empresa emisora', async () => {
    findEmisora.mockResolvedValue(emisora);

    await expect(useCase.execute()).resolves.toBe(emisora);
  });

  it('lanza 404 si no hay empresa emisora configurada', async () => {
    findEmisora.mockResolvedValue(null);

    await expect(useCase.execute()).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
  });
});
