import { PersonaEntity } from '../../../domain/entities/persona.entity';
import { UserEntity } from '../../../domain/entities/user.entity';
import { TipoDocumento } from '../../../domain/enums/persons.enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { UsuarioInterno } from '../../../domain/repositories/types/usuario-interno-repository.types';
import { RolAsignado } from '../../../domain/repositories/types/usuario-rol-repository.types';
import { UsuarioInternoRepository } from '../../../domain/repositories/usuario-interno.repository';
import { ChangeUsuarioInternoStatusUseCase } from './change-usuario-interno-status.use-case';

const fecha = new Date('2026-01-01T00:00:00.000Z');
const usuarioInterno = (
  id: string,
  roles: RolAsignado[],
  estado = true,
): UsuarioInterno => ({
  user: new UserEntity(
    id,
    `persona-${id}`,
    `${id}@francos.test`,
    id,
    'hash',
    estado,
    true,
    false,
    null,
    null,
    null,
    null,
    fecha,
    fecha,
  ),
  persona: new PersonaEntity(
    `persona-${id}`,
    'Nombre',
    'Paterno',
    'Materno',
    TipoDocumento.DNI,
    '12345678',
    null,
    null,
    null,
    true,
    fecha,
    fecha,
  ),
  roles,
});

describe('ChangeUsuarioInternoStatusUseCase', () => {
  const ADMIN = { rol_id: 1, nombre: 'admin' };
  const VENTAS = { rol_id: 2, nombre: 'ventas' };
  const repository = {
    findById: jest.fn(),
    setStatus: jest.fn(),
    countActiveAdmins: jest.fn(),
  };
  const useCase = new ChangeUsuarioInternoStatusUseCase(
    repository as unknown as UsuarioInternoRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.countActiveAdmins.mockResolvedValue(1);
  });

  it('responde 404 si el usuario no existe o no es interno', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('user-x', false, 'admin-1'),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(repository.setStatus).not.toHaveBeenCalled();
  });

  it('desactiva a otro usuario (el repositorio revoca sus tokens)', async () => {
    repository.findById.mockResolvedValue(usuarioInterno('user-1', [VENTAS]));

    await useCase.execute('user-1', false, 'admin-1');

    expect(repository.setStatus).toHaveBeenCalledWith('user-1', false);
    expect(repository.countActiveAdmins).not.toHaveBeenCalled();
  });

  it('impide desactivarse a sí mismo con 409', async () => {
    repository.findById.mockResolvedValue(usuarioInterno('admin-1', [ADMIN]));

    await expect(useCase.execute('admin-1', false, 'admin-1')).rejects.toThrow(
      new ResourceConflictError('No puedes desactivar tu propio usuario'),
    );
    expect(repository.setStatus).not.toHaveBeenCalled();
  });

  it('impide desactivar al último admin activo con 409', async () => {
    repository.findById.mockResolvedValue(usuarioInterno('admin-2', [ADMIN]));
    repository.countActiveAdmins.mockResolvedValue(0);

    await expect(
      useCase.execute('admin-2', false, 'admin-1'),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(repository.countActiveAdmins).toHaveBeenCalledWith('admin-2');
    expect(repository.setStatus).not.toHaveBeenCalled();
  });

  it('permite desactivar un admin si queda otro activo', async () => {
    repository.findById.mockResolvedValue(usuarioInterno('admin-2', [ADMIN]));

    await useCase.execute('admin-2', false, 'admin-1');

    expect(repository.setStatus).toHaveBeenCalledWith('admin-2', false);
  });

  it('reactiva sin reglas de autoprotección', async () => {
    repository.findById.mockResolvedValue(
      usuarioInterno('admin-1', [ADMIN], false),
    );

    await useCase.execute('admin-1', true, 'admin-1');

    expect(repository.setStatus).toHaveBeenCalledWith('admin-1', true);
    expect(repository.countActiveAdmins).not.toHaveBeenCalled();
  });
});
