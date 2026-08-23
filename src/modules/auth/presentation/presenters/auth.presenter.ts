import { UserEntity } from '../../../persons/domain/entities';
import { LoginResult } from '../../application/use-cases/login.use-case';

export class AuthPresenter {
  static registroToHttp(user: UserEntity) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      email_verificado: user.email_verificado,
      debe_cambiar_contrasena: user.debe_cambiar_contrasena,
    };
  }

  // El refresh token NUNCA va aquí — el controller lo pone en una cookie httpOnly aparte.
  static loginToHttp(result: LoginResult) {
    return {
      access_token: result.accessToken,
      roles: result.roles,
      email_verificado: result.emailVerificado,
      debe_cambiar_contrasena: result.debeCambiarContrasena,
    };
  }
}
