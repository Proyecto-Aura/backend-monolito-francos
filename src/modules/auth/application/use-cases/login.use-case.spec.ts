// En CI los tests unitarios corren sin .env: envs se reemplaza por lo que usa el login.
const DIAS_POR_DEFECTO = 7;
jest.mock('../../../../config/envs', () => ({
  envs: {
    jwtAccessExpiresIn: '40m',
    refreshTokenExpiresInDays: 7,
    requireVerifiedEmail: true,
  },
}));

import { JwtService } from '@nestjs/jwt';
import { UserEntity } from '../../../persons/domain/entities/user.entity';
import { UserRepository } from '../../../persons/domain/repositories/user.repository';
import { UsuarioRolRepository } from '../../../persons/domain/repositories/usuario-rol.repository';
import {
  EmailNotVerifiedError,
  InvalidCredentialsError,
} from '../../domain/errors/auth-domain.errors';
import { envs } from '../../../../config/envs';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { hashPassword } from '../utils/password.util';
import { DIAS_SESION_RECORDADA, LoginUseCase } from './login.use-case';

describe('LoginUseCase', () => {
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  const PASSWORD = 'Cliente123';

  const findByEmailOrUsername = jest.fn();
  const findRolesByUserId = jest.fn();
  const createRefreshToken = jest.fn();
  const signAsync = jest.fn();

  const useCase = new LoginUseCase(
    { findByEmailOrUsername } as unknown as jest.Mocked<UserRepository>,
    { findRolesByUserId } as unknown as jest.Mocked<UsuarioRolRepository>,
    {
      create: createRefreshToken,
    } as unknown as jest.Mocked<RefreshTokenRepository>,
    { signAsync } as unknown as JwtService,
  );

  let hash: string;
  const fecha = new Date('2026-01-01T00:00:00.000Z');
  const makeUser = (estado = true, emailVerificado = true) =>
    new UserEntity(
      'user-1',
      'persona-1',
      'rosa@francos.test',
      'rosaquispe',
      hash,
      estado,
      emailVerificado,
      false,
      null,
      null,
      null,
      null,
      fecha,
      fecha,
    );

  const vencimientoGuardado = () => {
    const [{ expires_at }] = createRefreshToken.mock.calls[0] as [
      { expires_at: Date },
    ];
    return expires_at;
  };

  // Días que faltan para que venza el refresh token guardado.
  const diasDelRefreshToken = () =>
    Math.round((vencimientoGuardado().getTime() - Date.now()) / MS_POR_DIA);

  beforeAll(async () => {
    hash = await hashPassword(PASSWORD);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    findByEmailOrUsername.mockResolvedValue(makeUser());
    findRolesByUserId.mockResolvedValue([{ nombre: 'cliente' }]);
    createRefreshToken.mockResolvedValue({ id: 'sesion-1' });
    signAsync.mockResolvedValue('jwt');
  });
  afterEach(() => {
    envs.requireVerifiedEmail = true;
  });

  it('inicia sesión con email o username y devuelve el token con los roles', async () => {
    const resultado = await useCase.execute({
      identificador: 'rosaquispe',
      password: PASSWORD,
    });

    expect(findByEmailOrUsername).toHaveBeenCalledWith('rosaquispe');
    expect(resultado).toMatchObject({ accessToken: 'jwt', roles: ['cliente'] });
    expect(resultado.refreshTokenPlano).toEqual(expect.any(String));
  });

  it('el token lleva el id de la sesión para poder invalidarlo (HU-B-004)', async () => {
    await useCase.execute({ identificador: 'rosaquispe', password: PASSWORD });

    expect(signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'user-1', sid: 'sesion-1' }),
      expect.anything(),
    );
  });

  it('sin "recordar" el refresh token dura los días por defecto', async () => {
    await useCase.execute({ identificador: 'rosaquispe', password: PASSWORD });

    expect(diasDelRefreshToken()).toBe(DIAS_POR_DEFECTO);
  });

  it('con "recordar" el refresh token dura 30 días (HU-B-001)', async () => {
    const resultado = await useCase.execute({
      identificador: 'rosaquispe',
      password: PASSWORD,
      recordar: true,
    });

    expect(diasDelRefreshToken()).toBe(DIAS_SESION_RECORDADA);
    expect(resultado.refreshTokenExpiresAt).toEqual(vencimientoGuardado());
  });

  it.each([
    ['el usuario no existe', null, PASSWORD],
    ['el usuario está inactivo', 'inactivo', PASSWORD],
    ['la contraseña es incorrecta', 'activo', 'otra-clave'],
  ])(
    'responde "Credenciales inválidas" si %s',
    async (_caso, usuario, password) => {
      findByEmailOrUsername.mockResolvedValue(
        usuario === null ? null : makeUser(usuario === 'activo'),
      );

      await expect(
        useCase.execute({ identificador: 'rosaquispe', password }),
      ).rejects.toThrow(new InvalidCredentialsError('Credenciales inválidas'));
      expect(createRefreshToken).not.toHaveBeenCalled();
    },
  );

  it('bloquea solo al cliente sin verificar después de validar contraseña', async () => {
    findByEmailOrUsername.mockResolvedValue(makeUser(true, false));
    await expect(
      useCase.execute({ identificador: 'rosaquispe', password: PASSWORD }),
    ).rejects.toBeInstanceOf(EmailNotVerifiedError);
    expect(createRefreshToken).not.toHaveBeenCalled();
    expect(signAsync).not.toHaveBeenCalled();
  });
  it('no revela la falta de verificación con contraseña incorrecta', async () => {
    findByEmailOrUsername.mockResolvedValue(makeUser(true, false));
    await expect(
      useCase.execute({
        identificador: 'rosaquispe',
        password: 'x'.repeat(12),
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
  it.each([
    { roles: ['ventas'] },
    { roles: ['cliente', 'ventas'] },
    { roles: [] },
  ])(
    'permite usuario sin verificar que no es solo cliente',
    async ({ roles }) => {
      findByEmailOrUsername.mockResolvedValue(makeUser(true, false));
      findRolesByUserId.mockResolvedValue(
        roles.map((nombre: string) => ({ nombre })),
      );
      await expect(
        useCase.execute({ identificador: 'rosaquispe', password: PASSWORD }),
      ).resolves.toBeDefined();
    },
  );
  it('permite cliente sin verificar si la política está desactivada', async () => {
    envs.requireVerifiedEmail = false;
    findByEmailOrUsername.mockResolvedValue(makeUser(true, false));
    await expect(
      useCase.execute({ identificador: 'rosaquispe', password: PASSWORD }),
    ).resolves.toBeDefined();
  });
});
