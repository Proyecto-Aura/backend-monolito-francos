import { UserEntity } from '../../../persons/domain/entities';
import { LoginResult } from '../../application/use-cases/login.use-case';
import { MeResult } from '../../application/use-cases/get-me.use-case';

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

  static meToHttp(result: MeResult) {
    return {
      nombre_completo: `${result.nombres} ${result.apellido_paterno} ${result.apellido_materno}`,
      nombres: result.nombres,
      apellido_paterno: result.apellido_paterno,
      apellido_materno: result.apellido_materno,
      email: result.email,
      username: result.username,
      roles: result.roles,
    };
  }
}
