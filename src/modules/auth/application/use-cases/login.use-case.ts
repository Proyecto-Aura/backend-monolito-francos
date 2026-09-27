import { Injectable } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';
import { JwtModuleOptions, JwtService } from '@nestjs/jwt';
import { UserRepository } from '../../../persons/domain/repositories/user.repository';
import { UsuarioRolRepository } from '../../../persons/domain/repositories/usuario-rol.repository';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { InvalidCredentialsError } from '../../domain/errors/auth-domain.errors';
import { comparePassword } from '../utils/password.util';
import { envs } from '../../../../config/envs';
import { generateRandomToken, hashToken } from '../utils/token.util';

export interface LoginResult {
  accessToken: string;
  refreshTokenPlano: string;
  roles: string[];
  emailVerificado: boolean;
  debeCambiarContrasena: boolean;
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly usuarioRolRepository: UsuarioRolRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(dto: LoginDto): Promise<LoginResult> {
    const user = await this.userRepository.findByEmailOrUsername(
      dto.identificador,
    );
    if (!user || !user.estado) {
      throw new InvalidCredentialsError('Credenciales inválidas');
    }
    const contrasena_valida = await comparePassword(
      dto.password,
      user.contrasena,
    );
    if (!contrasena_valida) {
      throw new InvalidCredentialsError('Credenciales inválidas');
    }

    const roles_asignados = await this.usuarioRolRepository.findRolesByUserId(
      user.id,
    );
    const roles = roles_asignados.map((r) => r.nombre);

    // generamos token jwt
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, roles },
      {
        expiresIn: envs.jwtAccessExpiresIn as NonNullable<
          JwtModuleOptions['signOptions']
        >['expiresIn'],
      },
    );

    const refreshTokenPlano = generateRandomToken();
    const tokenHash = hashToken(refreshTokenPlano);
    const expiresAt = new Date(
      Date.now() + envs.refreshTokenExpiresInDays * MS_POR_DIA,
    );

    await this.refreshTokenRepository.create({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    return {
      accessToken,
      refreshTokenPlano,
      roles,
      emailVerificado: user.email_verificado,
      debeCambiarContrasena: user.debe_cambiar_contrasena,
    };
  }
}
