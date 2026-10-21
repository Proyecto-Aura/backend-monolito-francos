// En CI los tests unitarios corren sin .env: la estrategia solo usa el secreto.
jest.mock('../../../../config/envs', () => ({
  envs: { jwtSecret: 'secreto-de-prueba' },
}));

import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenEntity } from '../../domain/entities/refresh-token.entity';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import {
  JwtPayload,
  JwtStrategy,
  SESION_CERRADA_MESSAGE,
} from './jwt.strategy';

describe('JwtStrategy (HU-B-004)', () => {
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  const findById = jest.fn();
  const strategy = new JwtStrategy({
    findById,
  } as unknown as jest.Mocked<RefreshTokenRepository>);

  const payload: JwtPayload = {
    sub: 'user-1',
    email: 'rosa@francos.test',
    roles: ['cliente'],
    sid: 'sesion-1',
  };

  const makeSesion = (revokedAt: Date | null, venceEnDias = 7) =>
    new RefreshTokenEntity(
      'sesion-1',
      'user-1',
      'hash',
      new Date(Date.now() + venceEnDias * MS_POR_DIA),
      revokedAt,
      new Date(),
    );

  beforeEach(() => jest.clearAllMocks());

  it('con la sesión abierta deja pasar al usuario', async () => {
    findById.mockResolvedValue(makeSesion(null));

    await expect(strategy.validate(payload)).resolves.toEqual({
      userId: 'user-1',
      email: 'rosa@francos.test',
      roles: ['cliente'],
    });
    expect(findById).toHaveBeenCalledWith('sesion-1');
  });

  it.each([
    ['la sesión fue cerrada', () => makeSesion(new Date())],
    ['la sesión venció', () => makeSesion(null, -1)],
    ['la sesión no existe', () => null],
  ])('rechaza el token si %s', async (_caso, sesion) => {
    findById.mockResolvedValue(sesion());

    await expect(strategy.validate(payload)).rejects.toThrow(
      new UnauthorizedException(SESION_CERRADA_MESSAGE),
    );
  });

  it('rechaza un token sin sesión (emitido antes de este cambio)', async () => {
    const sinSesion = { ...payload, sid: undefined } as unknown as JwtPayload;

    await expect(strategy.validate(sinSesion)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(findById).not.toHaveBeenCalled();
  });
});
