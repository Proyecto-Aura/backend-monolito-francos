import { PersonaEntity } from '../../../domain/entities/persona.entity';
import { RolEntity } from '../../../domain/entities/rol.entity';
import { UserEntity } from '../../../domain/entities/user.entity';
import { TipoDocumento } from '../../../domain/enums/persons.enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { RolRepository } from '../../../domain/repositories/rol.repository';
import { UsuarioInterno } from '../../../domain/repositories/types/usuario-interno-repository.types';
import { RolAsignado } from '../../../domain/repositories/types/usuario-rol-repository.types';
import { UsuarioInternoRepository } from '../../../domain/repositories/usuario-interno.repository';
import { SetUsuarioInternoRolesUseCase } from './set-usuario-interno-roles.use-case';

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

describe('SetUsuarioInternoRolesUseCase', () => {
  const ADMIN = { rol_id: 1, nombre: 'admin' };
  const VENTAS = { rol_id: 2, nombre: 'ventas' };
  const roles: Record<number, RolEntity> = {
    1: new RolEntity(1, 'admin', null, true, fecha, fecha),
    2: new RolEntity(2, 'ventas', null, true, fecha, fecha),
    3: new RolEntity(3, 'cliente', null, true, fecha, fecha),
    4: new RolEntity(4, 'produccion', null, false, fecha, fecha),
    5: new RolEntity(5, 'inventario', null, true, fecha, fecha),
  };
  const repository = {
    findById: jest.fn(),
    replaceRoles: jest.fn(),
    countActiveAdmins: jest.fn(),
  };
  const rolRepository = {
    findById: jest.fn((id: number) => Promise.resolve(roles[id] ?? null)),
  };
  const useCase = new SetUsuarioInternoRolesUseCase(
    repository as unknown as UsuarioInternoRepository,
    rolRepository as unknown as RolRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.countActiveAdmins.mockResolvedValue(1);
  });

  it('responde 404 si el usuario no existe o no es interno', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('user-x', { rol_ids: [2] }, 'admin-1'),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });

  it('reemplaza los roles de otro usuario', async () => {
    repository.findById.mockResolvedValue(usuarioInterno('user-1', [VENTAS]));

    await useCase.execute('user-1', { rol_ids: [5, 2] }, 'admin-1');

    expect(repository.replaceRoles).toHaveBeenCalledWith('user-1', [5, 2]);
  });

  it.each([
    ['inexistente', [99], ResourceNotFoundError],
    ['inactivo', [4], ResourceConflictError],
    ['cliente', [3], ResourceConflictError],
  ])('rechaza un rol %s', async (_caso, rolIds, error) => {
    repository.findById.mockResolvedValue(usuarioInterno('user-1', [VENTAS]));

    await expect(
      useCase.execute('user-1', { rol_ids: rolIds }, 'admin-1'),
    ).rejects.toBeInstanceOf(error);
    expect(repository.replaceRoles).not.toHaveBeenCalled();
  });

  it('impide quitarse el rol admin a sí mismo con 409', async () => {
    repository.findById.mockResolvedValue(usuarioInterno('admin-1', [ADMIN]));

    await expect(
      useCase.execute('admin-1', { rol_ids: [2] }, 'admin-1'),
    ).rejects.toThrow(
      new ResourceConflictError('No puedes quitarte el rol admin'),
    );
    expect(repository.replaceRoles).not.toHaveBeenCalled();
  });

  it('permite cambiar sus otros roles conservando admin', async () => {
    repository.findById.mockResolvedValue(usuarioInterno('admin-1', [ADMIN]));

    await useCase.execute('admin-1', { rol_ids: [1, 2] }, 'admin-1');

    expect(repository.replaceRoles).toHaveBeenCalledWith('admin-1', [1, 2]);
  });

  it('impide quitar admin al último admin activo con 409', async () => {
    repository.findById.mockResolvedValue(usuarioInterno('admin-2', [ADMIN]));
    repository.countActiveAdmins.mockResolvedValue(0);

    await expect(
      useCase.execute('admin-2', { rol_ids: [2] }, 'admin-1'),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    expect(repository.countActiveAdmins).toHaveBeenCalledWith('admin-2');
    expect(repository.replaceRoles).not.toHaveBeenCalled();
  });

  it('permite quitar admin a otro si queda otro admin activo', async () => {
    repository.findById.mockResolvedValue(usuarioInterno('admin-2', [ADMIN]));

    await useCase.execute('admin-2', { rol_ids: [2] }, 'admin-1');

    expect(repository.replaceRoles).toHaveBeenCalledWith('admin-2', [2]);
  });

  it('no exige otro admin si el admin afectado ya está inactivo', async () => {
    repository.findById.mockResolvedValue(
      usuarioInterno('admin-2', [ADMIN], false),
    );
    repository.countActiveAdmins.mockResolvedValue(0);

    await useCase.execute('admin-2', { rol_ids: [2] }, 'admin-1');

    expect(repository.countActiveAdmins).not.toHaveBeenCalled();
    expect(repository.replaceRoles).toHaveBeenCalledWith('admin-2', [2]);
  });
});
