import { comparePassword } from '../../../../auth/application/utils/password.util';
import { PersonaEntity } from '../../../domain/entities/persona.entity';
import { UserEntity } from '../../../domain/entities/user.entity';
import { TipoDocumento } from '../../../domain/enums/persons.enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import {
  UpdateUsuarioInternoParams,
  UsuarioInterno,
} from '../../../domain/repositories/types/usuario-interno-repository.types';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { UsuarioInternoRepository } from '../../../domain/repositories/usuario-interno.repository';
import { UpdateUsuarioInternoUseCase } from './update-usuario-interno.use-case';

describe('UpdateUsuarioInternoUseCase', () => {
  const fecha = new Date('2026-01-01T00:00:00.000Z');
  const usuario: UsuarioInterno = {
    user: new UserEntity(
      'user-1',
      'persona-1',
      'lucia@francos.test',
      'lquispe',
      'hash',
      true,
      false,
      true,
      null,
      null,
      null,
      null,
      fecha,
      fecha,
    ),
    persona: new PersonaEntity(
      'persona-1',
      'Lucia',
      'Quispe',
      'Huaman',
      TipoDocumento.DNI,
      '45678912',
      null,
      null,
      null,
      true,
      fecha,
      fecha,
    ),
    roles: [{ rol_id: 2, nombre: 'ventas' }],
  };

  const usuarioInternoRepository = {
    findById: jest.fn(),
    update: jest.fn(),
  };
  const userRepository = { existsByUsername: jest.fn() };
  const useCase = new UpdateUsuarioInternoUseCase(
    usuarioInternoRepository as unknown as UsuarioInternoRepository,
    userRepository as unknown as UserRepository,
  );

  const updateParams = () =>
    (
      usuarioInternoRepository.update.mock.calls[0] as [
        string,
        UpdateUsuarioInternoParams,
      ]
    )[1];

  beforeEach(() => {
    jest.clearAllMocks();
    usuarioInternoRepository.findById.mockResolvedValue(usuario);
    userRepository.existsByUsername.mockResolvedValue(false);
  });

  it('responde 404 si el usuario no existe o no es interno', async () => {
    usuarioInternoRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('user-x', { nombres: 'Otro' }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });

  it('actualiza datos personales sin tocar la contraseña', async () => {
    await useCase.execute('user-1', {
      nombres: 'Lucía',
      apellido_paterno: 'Quispe',
      apellido_materno: 'Mamani',
    });

    expect(updateParams()).toEqual({
      nombres: 'Lucía',
      apellido_paterno: 'Quispe',
      apellido_materno: 'Mamani',
      username: undefined,
      contrasena_hash: undefined,
    });
    expect(userRepository.existsByUsername).not.toHaveBeenCalled();
  });

  it('rechaza un username en uso por otro usuario con 409', async () => {
    userRepository.existsByUsername.mockResolvedValue(true);

    await expect(
      useCase.execute('user-1', { username: 'admin' }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(userRepository.existsByUsername).toHaveBeenCalledWith(
      'admin',
      'user-1',
    );
    expect(usuarioInternoRepository.update).not.toHaveBeenCalled();
  });

  it('no consulta duplicados si el username no cambia', async () => {
    await useCase.execute('user-1', { username: 'lquispe' });

    expect(userRepository.existsByUsername).not.toHaveBeenCalled();
    expect(updateParams().username).toBe('lquispe');
  });

  it('hashea la nueva contraseña (el repositorio revoca los tokens)', async () => {
    await useCase.execute('user-1', { contrasena: 'NuevaClave123' });

    const { contrasena_hash } = updateParams();
    expect(contrasena_hash).toBeDefined();
    expect(contrasena_hash).not.toBe('NuevaClave123');
    await expect(
      comparePassword('NuevaClave123', contrasena_hash as string),
    ).resolves.toBe(true);
  });
});
