import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../../../persons/domain/repositories/user.repository';
import { UsuarioRolRepository } from '../../../persons/domain/repositories/usuario-rol.repository';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { InvalidCredentialsError } from '../../domain/errors/auth-domain.errors';
import { hashToken } from '../utils/token.util';
import { envs } from '../../../../config/envs';

export interface RefreshTokenResult {
  accessToken: string;
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly userRepository: UserRepository,
    private readonly usuarioRolRepository: UsuarioRolRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(refreshTokenPlano: string): Promise<RefreshTokenResult> {
    const tokenHash = hashToken(refreshTokenPlano);
    const refreshToken =
      await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (
      !refreshToken ||
      refreshToken.revoked_at ||
      refreshToken.expires_at < new Date()
    ) {
      throw new InvalidCredentialsError('Refresh token inválido o expirado');
    }

    const user = await this.userRepository.findById(refreshToken.user_id);
    if (!user || !user.estado) {
      throw new InvalidCredentialsError('Refresh token inválido o expirado');
    }

    const rolesAsignados = await this.usuarioRolRepository.findRolesByUserId(
      user.id,
    );
    const roles = rolesAsignados.map((r) => r.nombre);

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, roles },
      { expiresIn: envs.jwtAccessExpiresIn as any },
    );

    return { accessToken };
  }
}
