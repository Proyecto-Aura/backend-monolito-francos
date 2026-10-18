import { PersonaEntity } from '../../domain/entities/persona.entity';
import { UserEntity } from '../../domain/entities/user.entity';
import { TipoDocumento } from '../../domain/enums/persons.enums';
import { UsuarioInterno } from '../../domain/repositories/types/usuario-interno-repository.types';
import { UsuarioInternoPresenter } from './usuario-interno.presenter';

describe('UsuarioInternoPresenter', () => {
  const fecha = new Date('2026-01-01T00:00:00.000Z');
  const usuario: UsuarioInterno = {
    user: new UserEntity(
      'user-1',
      'persona-1',
      'lucia@francos.test',
      'lquispe',
      '$2b$10$hash-que-no-debe-salir',
      true,
      false,
      true,
      'token-verificacion',
      fecha,
      'token-recuperacion',
      fecha,
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
    roles: [
      { rol_id: 1, nombre: 'admin' },
      { rol_id: 2, nombre: 'ventas' },
    ],
  };

  it('expone datos personales, credenciales públicas y roles', () => {
    expect(UsuarioInternoPresenter.toHttp(usuario)).toEqual({
      id: 'user-1',
      persona_id: 'persona-1',
      nombres: 'Lucia',
      apellido_paterno: 'Quispe',
      apellido_materno: 'Huaman',
      tipo_documento: 'dni',
      numero_documento: '45678912',
      email: 'lucia@francos.test',
      username: 'lquispe',
      estado: true,
      email_verificado: false,
      debe_cambiar_contrasena: true,
      roles: [
        { id: 1, nombre: 'admin' },
        { id: 2, nombre: 'ventas' },
      ],
      created_at: fecha,
      updated_at: fecha,
    });
  });

  it('nunca expone contraseña, hash ni tokens', () => {
    const http = UsuarioInternoPresenter.toHttp(usuario);
    const json = JSON.stringify(http);

    expect(http).not.toHaveProperty('contrasena');
    expect(Object.keys(http).some((key) => key.startsWith('token_'))).toBe(
      false,
    );
    expect(json).not.toContain('$2b$');
    expect(json).not.toContain('token-');
  });

  it('pagina con meta total y total_pages', () => {
    expect(
      UsuarioInternoPresenter.paginatedToHttp({
        data: [usuario],
        total: 11,
        page: 2,
        limit: 10,
      }).meta,
    ).toEqual({ total: 11, page: 2, limit: 10, total_pages: 2 });
  });
});
