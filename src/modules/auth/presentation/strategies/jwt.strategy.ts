import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { envs } from '../../../../config/envs';

// contrato de respuesta
export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // extraccion del token
      ignoreExpiration: false, // verificar expiracion
      secretOrKey: envs.jwtSecret, // verificar si coincide con la firma
    });
  }

  // si todo pasa, passport lo pega al request
  validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email, roles: payload.roles };
  }
}
