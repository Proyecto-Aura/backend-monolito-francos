import { ResourceNotFoundError } from '../../domain/errors/auth-domain.errors';
import { PersonaRepository } from '../../../persons/domain/repositories/persona.repository';
import { UserRepository } from '../../../persons/domain/repositories/user.repository';
import { UserEntity } from '../../../persons/domain/entities/user.entity';
import { PersonaEntity } from '../../../persons/domain/entities/persona.entity';
import { GetMeUseCase } from './get-me.use-case';

describe('GetMeUseCase', () => {
  const findUserById = jest.fn();
  const findPersonaById = jest.fn();
  const userRepository = {
    findById: findUserById,
  } as unknown as jest.Mocked<UserRepository>;
  const personaRepository = {
    findById: findPersonaById,
  } as unknown as jest.Mocked<PersonaRepository>;

  const useCase = new GetMeUseCase(userRepository, personaRepository);

  const fecha = new Date('2026-01-01T00:00:00.000Z');
  const user = new UserEntity(
    'user-1',
    'persona-1',
    'admin@francos.test',
    'admin',
    'hash',
    true,
    true,
    false,
    null,
    null,
    null,
    null,
    fecha,
    fecha,
  );
  const persona = new PersonaEntity(
    'persona-1',
    'Andres',
    'Chavarri',
    'Centeno',
    'dni' as PersonaEntity['tipo_documento'],
    '00000001',
    null,
    null,
    null,
    true,
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve el nombre de la persona vinculada y los roles recibidos', async () => {
    findUserById.mockResolvedValue(user);
    findPersonaById.mockResolvedValue(persona);

    await expect(useCase.execute('user-1', ['admin'])).resolves.toEqual({
      nombres: 'Andres',
      apellido_paterno: 'Chavarri',
      apellido_materno: 'Centeno',
      email: 'admin@francos.test',
      username: 'admin',
      roles: ['admin'],
    });

    expect(findUserById).toHaveBeenCalledWith('user-1');
    expect(findPersonaById).toHaveBeenCalledWith('persona-1');
  });

  it('lanza 404 si el usuario del token ya no existe', async () => {
    findUserById.mockResolvedValue(null);

    await expect(
      useCase.execute('user-inexistente', ['admin']),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(findPersonaById).not.toHaveBeenCalled();
  });

  it('lanza 404 si la persona vinculada no existe', async () => {
    findUserById.mockResolvedValue(user);
    findPersonaById.mockResolvedValue(null);

    await expect(useCase.execute('user-1', ['admin'])).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
  });
});
