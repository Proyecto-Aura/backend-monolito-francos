import { UserEntity } from '../../../persons/domain/entities';

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
}
