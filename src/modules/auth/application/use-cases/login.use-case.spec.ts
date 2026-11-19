// En CI los tests unitarios corren sin .env: envs se reemplaza por lo que usa el login.
const DIAS_POR_DEFECTO = 7;
jest.mock('../../../../config/envs', () => ({
  envs: {
    jwtAccessExpiresIn: '40m',
    refreshTokenExpiresInDays: 7,
    requireVerifiedEmail: true,
    loginMaxIntentos: 5,
    loginBloqueoMinutos: 15,
  },
}));

import { JwtService } from '@nestjs/jwt';
import { UserEntity } from '../../../persons/domain/entities/user.entity';
import { UserRepository } from '../../../persons/domain/repositories/user.repository';
import { UsuarioRolRepository } from '../../../persons/domain/repositories/usuario-rol.repository';
import {
  AccountLockedError,
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
  const registrarLoginFallido = jest.fn();
  const reiniciarLoginFallido = jest.fn();
  const findRolesByUserId = jest.fn();
  const createRefreshToken = jest.fn();
  const signAsync = jest.fn();

  const useCase = new LoginUseCase(
    {
      findByEmailOrUsername,
      registrarLoginFallido,
      reiniciarLoginFallido,
    } as unknown as jest.Mocked<UserRepository>,
    { findRolesByUserId } as unknown as jest.Mocked<UsuarioRolRepository>,
    {
      create: createRefreshToken,
    } as unknown as jest.Mocked<RefreshTokenRepository>,
    { signAsync } as unknown as JwtService,
  );

  let hash: string;
  const fecha = new Date('2026-01-01T00:00:00.000Z');
  const makeUser = (
    estado = true,
    emailVerificado = true,
    intentosFallidos = 0,
    bloqueadoHasta: Date | null = null,
  ) =>
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
      intentosFallidos,
      bloqueadoHasta,
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
    registrarLoginFallido.mockResolvedValue(false);
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

  describe('bloqueo por intentos fallidos', () => {
    const MS_POR_MINUTO = 60 * 1000;
    const enMinutos = (minutos: number) =>
      new Date(Date.now() + minutos * MS_POR_MINUTO);

    it('con contraseña incorrecta registra el fallo con el máximo y el bloqueo configurados', async () => {
      await expect(
        useCase.execute({
          identificador: 'rosaquispe',
          password: 'otra-clave',
        }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);

      expect(registrarLoginFallido).toHaveBeenCalledWith(
        'user-1',
        5,
        expect.any(Date),
      );
      const [, , bloqueadoHasta] = registrarLoginFallido.mock.calls[0] as [
        string,
        number,
        Date,
      ];
      const minutos = (bloqueadoHasta.getTime() - Date.now()) / MS_POR_MINUTO;
      expect(Math.round(minutos)).toBe(15);
    });

    it('el fallo que alcanza el máximo bloquea la cuenta y responde 429 con la espera', async () => {
      registrarLoginFallido.mockResolvedValue(true);

      const error = await useCase
        .execute({ identificador: 'rosaquispe', password: 'otra-clave' })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AccountLockedError);
      const bloqueo = error as AccountLockedError;
      expect(bloqueo.statusCode).toBe(429);
      expect(bloqueo.message).toBe(
        'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos o restablece tu contraseña',
      );
      expect(bloqueo.retryAfterSeconds).toBe(15 * 60);
      expect(createRefreshToken).not.toHaveBeenCalled();
    });

    it('con la cuenta bloqueada rechaza incluso la contraseña correcta, sin contar otro fallo', async () => {
      findByEmailOrUsername.mockResolvedValue(
        makeUser(true, true, 0, enMinutos(3)),
      );

      await expect(
        useCase.execute({ identificador: 'rosaquispe', password: PASSWORD }),
      ).rejects.toThrow(
        'Demasiados intentos fallidos. Intenta de nuevo en 3 minutos o restablece tu contraseña',
      );
      expect(registrarLoginFallido).not.toHaveBeenCalled();
      expect(createRefreshToken).not.toHaveBeenCalled();
      expect(signAsync).not.toHaveBeenCalled();
    });

    it('cuando quedan menos de 60 s dice "1 minuto"', async () => {
      findByEmailOrUsername.mockResolvedValue(
        makeUser(true, true, 0, new Date(Date.now() + 20 * 1000)),
      );

      await expect(
        useCase.execute({ identificador: 'rosaquispe', password: PASSWORD }),
      ).rejects.toThrow('Intenta de nuevo en 1 minuto o restablece');
    });

    it('con el bloqueo vencido deja entrar y limpia el bloqueo', async () => {
      findByEmailOrUsername.mockResolvedValue(
        makeUser(true, true, 0, enMinutos(-1)),
      );

      await expect(
        useCase.execute({ identificador: 'rosaquispe', password: PASSWORD }),
      ).resolves.toMatchObject({ accessToken: 'jwt' });
      expect(reiniciarLoginFallido).toHaveBeenCalledWith('user-1');
    });

    it('un login correcto reinicia los fallos acumulados', async () => {
      findByEmailOrUsername.mockResolvedValue(makeUser(true, true, 3));

      await useCase.execute({
        identificador: 'rosaquispe',
        password: PASSWORD,
      });

      expect(reiniciarLoginFallido).toHaveBeenCalledWith('user-1');
    });

    it('un login correcto sin fallos previos no escribe en la base', async () => {
      await useCase.execute({
        identificador: 'rosaquispe',
        password: PASSWORD,
      });

      expect(reiniciarLoginFallido).not.toHaveBeenCalled();
    });

    it.each([
      ['el usuario no existe', false],
      ['el usuario está inactivo', true],
    ])('no cuenta fallos si %s', async (_caso, existe) => {
      findByEmailOrUsername.mockResolvedValue(existe ? makeUser(false) : null);

      await expect(
        useCase.execute({
          identificador: 'rosaquispe',
          password: 'otra-clave',
        }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
      expect(registrarLoginFallido).not.toHaveBeenCalled();
    });
  });
});
