import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { envs } from '../../../../config/envs';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';

// contrato de respuesta
export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  // id de la sesión (refresh token) que emitió el token
  sid: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  roles: string[];
}

export const SESION_CERRADA_MESSAGE = 'La sesión fue cerrada';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly refreshTokenRepository: RefreshTokenRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // extraccion del token
      ignoreExpiration: false, // verificar expiracion
      secretOrKey: envs.jwtSecret, // verificar si coincide con la firma
    });
  }

  // si todo pasa, passport lo pega al request
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // HU-B-004: al cerrar sesión se revoca la sesión y su token deja de servir
    const sesion = payload.sid
      ? await this.refreshTokenRepository.findById(payload.sid)
      : null;
    if (!sesion || sesion.revoked_at || sesion.expires_at < new Date()) {
      throw new UnauthorizedException(SESION_CERRADA_MESSAGE);
    }

    return { userId: payload.sub, email: payload.email, roles: payload.roles };
  }
}
