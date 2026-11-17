import { EmpresaEntity } from '../../../domain/entities/empresa.entity';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { EmpresaRepository } from '../../../domain/repositories/empresa.repository';
import { QuitarLogoEmpresaEmisoraUseCase } from './quitar-logo-empresa-emisora.use-case';

describe('QuitarLogoEmpresaEmisoraUseCase', () => {
  const findEmisora = jest.fn();
  const update = jest.fn();
  const useCase = new QuitarLogoEmpresaEmisoraUseCase({
    findEmisora,
    update,
  } as unknown as EmpresaRepository);

  beforeEach(() => jest.clearAllMocks());

  it('deja logo_url en null en la emisora', async () => {
    const emisora = { id: 7, logo_url: 'http://x/logo.png' } as EmpresaEntity;
    findEmisora.mockResolvedValue(emisora);
    update.mockResolvedValue({ ...emisora, logo_url: null });

    const empresa = await useCase.execute();

    expect(update).toHaveBeenCalledWith(7, { logo_url: null });
    expect(empresa.logo_url).toBeNull();
  });

  it('lanza 404 de dominio si no hay emisora y no actualiza nada', async () => {
    findEmisora.mockResolvedValue(null);

    await expect(useCase.execute()).rejects.toThrow(ResourceNotFoundError);
    expect(update).not.toHaveBeenCalled();
  });
});
