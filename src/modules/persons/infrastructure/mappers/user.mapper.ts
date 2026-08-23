import { User as PrismaUser } from '@prisma/client';
import { UserEntity } from '../../domain/entities/user.entity';

export class UserMapper {
  static toDomain(user: PrismaUser): UserEntity {
    return new UserEntity(
      user.id,
      user.persona_id,
      user.email,
      user.username,
      user.contrasena,
      user.estado,
      user.email_verificado,
      user.debe_cambiar_contrasena,
      user.token_verificacion_email,
      user.token_verificacion_email_expiracion,
      user.token_recuperacion,
      user.token_expiracion,
      user.created_at,
      user.updated_at,
    );
  }
}
