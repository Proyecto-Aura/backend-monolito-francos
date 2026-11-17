import { UserEntity } from '../../../persons/domain/entities/user.entity';
import { VerifyEmailParams } from './types/email-verification-repository.types';

export abstract class EmailVerificationRepository {
  abstract saveToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>;
  abstract findUserByTokenHash(tokenHash: string): Promise<UserEntity | null>;
  abstract verifyEmail(params: VerifyEmailParams): Promise<boolean>;
}
