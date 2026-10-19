import { UserEntity } from '../../../persons/domain/entities/user.entity';
import { ResetPasswordParams } from './types/password-reset-repository.types';

export abstract class PasswordResetRepository {
  abstract saveToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>;
  abstract findUserByTokenHash(tokenHash: string): Promise<UserEntity | null>;
  abstract resetPassword(params: ResetPasswordParams): Promise<boolean>;
}
