import { ResourceConflictError } from '../../../domain/errors/persons-domain.errors';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { GetPerfilUseCase, PerfilCliente } from './get-perfil.use-case';
import { UpdatePerfilUseCase } from './update-perfil.use-case';

describe('UpdatePerfilUseCase (HU-B-015)', () => {
  const perfil = {
    user: { id: 'user-1', email: 'rosa@francos.test' },
    persona: { id: 'persona-1' },
    cliente: null,
  } as unknown as PerfilCliente;

  const existsByEmail = jest.fn();
  const updateWithPersona = jest.fn();
  const getPerfil = { execute: jest.fn() };

  const useCase = new UpdatePerfilUseCase(
    {
      existsByEmail,
      updateWithPersona,
    } as unknown as jest.Mocked<UserRepository>,
    getPerfil as unknown as GetPerfilUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    getPerfil.execute.mockResolvedValue(perfil);
    existsByEmail.mockResolvedValue(false);
  });

  it('updates name, email and phone of the logged-in client in one go', async () => {
    await useCase.execute('user-1', {
      nombres: 'Rosa María',
      email: 'rosa.nueva@francos.test',
      telefono: '987654321',
    });

    expect(existsByEmail).toHaveBeenCalledWith(
      'rosa.nueva@francos.test',
      'user-1',
    );
    expect(updateWithPersona).toHaveBeenCalledWith(
      'user-1',
      { email: 'rosa.nueva@francos.test' },
      { nombres: 'Rosa María', telefono: '987654321' },
    );
  });

  it('only changes what is sent', async () => {
    await useCase.execute('user-1', { telefono: '912345678' });

    expect(existsByEmail).not.toHaveBeenCalled();
    expect(updateWithPersona).toHaveBeenCalledWith(
      'user-1',
      { email: undefined },
      { nombres: undefined, telefono: '912345678' },
    );
  });

  it('rejects an email that another account already uses (409)', async () => {
    existsByEmail.mockResolvedValue(true);

    await expect(
      useCase.execute('user-1', { email: 'otro@francos.test' }),
    ).rejects.toThrow(
      new ResourceConflictError('Ese correo ya está registrado en otra cuenta'),
    );
    expect(updateWithPersona).not.toHaveBeenCalled();
  });

  it('keeps the same email without looking it up', async () => {
    await useCase.execute('user-1', { email: 'rosa@francos.test' });

    expect(existsByEmail).not.toHaveBeenCalled();
    expect(updateWithPersona).toHaveBeenCalled();
  });
});
