import { comparePassword } from '../../../../auth/application/utils/password.util';
import { RolEntity } from '../../../domain/entities/rol.entity';
import { TipoDocumento } from '../../../domain/enums/persons.enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { PersonaRepository } from '../../../domain/repositories/persona.repository';
import { RolRepository } from '../../../domain/repositories/rol.repository';
import { CreateUsuarioInternoParams } from '../../../domain/repositories/types/usuario-interno-repository.types';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { UsuarioInternoRepository } from '../../../domain/repositories/usuario-interno.repository';
import { CreateUsuarioInternoDto } from '../../dto/usuario-interno-dtos/create-usuario-interno.dto';
import { CreateUsuarioInternoUseCase } from './create-usuario-interno.use-case';

describe('CreateUsuarioInternoUseCase', () => {
  const fecha = new Date('2026-01-01T00:00:00.000Z');
  const roles: Record<number, RolEntity> = {
    1: new RolEntity(1, 'admin', null, true, fecha, fecha),
    2: new RolEntity(2, 'ventas', null, true, fecha, fecha),
    3: new RolEntity(3, 'cliente', null, true, fecha, fecha),
    4: new RolEntity(4, 'produccion', null, false, fecha, fecha),
  };

  const usuarioInternoRepository = { create: jest.fn() };
  const personaRepository = { existsByDocument: jest.fn() };
  const userRepository = {
    existsByEmail: jest.fn(),
    existsByUsername: jest.fn(),
  };
  const rolRepository = {
    findById: jest.fn((id: number) => Promise.resolve(roles[id] ?? null)),
  };
  const useCase = new CreateUsuarioInternoUseCase(
    usuarioInternoRepository as unknown as UsuarioInternoRepository,
    personaRepository as unknown as PersonaRepository,
    userRepository as unknown as UserRepository,
    rolRepository as unknown as RolRepository,
  );

  const dto = (
    overrides: Partial<CreateUsuarioInternoDto> = {},
  ): CreateUsuarioInternoDto =>
    Object.assign(new CreateUsuarioInternoDto(), {
      nombres: 'Lucia',
      apellido_paterno: 'Quispe',
      apellido_materno: 'Huaman',
      tipo_documento: TipoDocumento.DNI,
      numero_documento: '45678912',
      email: 'lucia@francos.test',
      username: 'lquispe',
      contrasena: 'ClaveSegura123',
      rol_ids: [2],
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    personaRepository.existsByDocument.mockResolvedValue(false);
    userRepository.existsByEmail.mockResolvedValue(false);
    userRepository.existsByUsername.mockResolvedValue(false);
  });

  it('crea persona, user y roles con la contraseña elegida hasheada', async () => {
    await useCase.execute(dto({ rol_ids: [1, 2] }));

    expect(usuarioInternoRepository.create).toHaveBeenCalledTimes(1);
    const [params] = usuarioInternoRepository.create.mock.calls[0] as [
      CreateUsuarioInternoParams,
    ];
    expect(params.persona).toEqual({
      nombres: 'Lucia',
      apellido_paterno: 'Quispe',
      apellido_materno: 'Huaman',
      tipo_documento: TipoDocumento.DNI,
      numero_documento: '45678912',
    });
    expect(params.user).toMatchObject({
      email: 'lucia@francos.test',
      username: 'lquispe',
      estado: true,
      email_verificado: false,
      debe_cambiar_contrasena: true,
    });
    expect(params.user.contrasena_hash).not.toBe('ClaveSegura123');
    await expect(
      comparePassword('ClaveSegura123', params.user.contrasena_hash),
    ).resolves.toBe(true);
    expect(params.rol_ids).toEqual([1, 2]);
  });

  it('respeta estado=false', async () => {
    await useCase.execute(dto({ estado: false }));

    const [params] = usuarioInternoRepository.create.mock.calls[0] as [
      CreateUsuarioInternoParams,
    ];
    expect(params.user.estado).toBe(false);
  });

  it.each([
    ['documento', () => personaRepository.existsByDocument],
    ['email', () => userRepository.existsByEmail],
    ['username', () => userRepository.existsByUsername],
  ])('rechaza %s duplicado con 409', async (_campo, mock) => {
    mock().mockResolvedValue(true);

    await expect(useCase.execute(dto())).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(usuarioInternoRepository.create).not.toHaveBeenCalled();
  });

  it('rechaza un rol inexistente con 404', async () => {
    await expect(
      useCase.execute(dto({ rol_ids: [2, 99] })),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(usuarioInternoRepository.create).not.toHaveBeenCalled();
  });

  it('rechaza un rol inactivo con 409', async () => {
    await expect(useCase.execute(dto({ rol_ids: [4] }))).rejects.toThrow(
      new ResourceConflictError('El rol produccion no está activo'),
    );
  });

  it('rechaza el rol cliente con 409', async () => {
    await expect(
      useCase.execute(dto({ rol_ids: [2, 3] })),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(usuarioInternoRepository.create).not.toHaveBeenCalled();
  });
});
