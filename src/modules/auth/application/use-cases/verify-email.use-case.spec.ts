import { UserEntity } from '../../../persons/domain/entities/user.entity';
import { EmailVerificationRepository } from '../../domain/repositories/email-verification.repository';
import { InvalidVerificationTokenError } from '../../domain/errors/auth-domain.errors';
import { VerifyEmailUseCase } from './verify-email.use-case';
import { hashToken } from '../utils/token.util';

function user(overrides: Partial<UserEntity> = {}) {
  return Object.assign(
    new UserEntity(
      'user-id',
      'persona-id',
      'usuario@francos.test',
      'usuario',
      'hash',
      true,
      false,
      false,
      'hash',
      new Date(Date.now() + 1000),
      null,
      null,
      new Date(),
      new Date(),
    ),
    overrides,
  );
}

describe('VerifyEmailUseCase', () => {
  const repository = { findUserByTokenHash: jest.fn(), verifyEmail: jest.fn() };
  const useCase = new VerifyEmailUseCase(
    repository as unknown as EmailVerificationRepository,
  );
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['no existe', null],
    [
      'expiró',
      user({ token_verificacion_email_expiracion: new Date(Date.now() - 1) }),
    ],
    ['el usuario está inactivo', user({ estado: false })],
  ])('rechaza si %s', async (_, found) => {
    repository.findUserByTokenHash.mockResolvedValue(found);
    await expect(
      useCase.execute({ token: 'token-prueba' }),
    ).rejects.toBeInstanceOf(InvalidVerificationTokenError);
  });

  it('rechaza si otro proceso consumió el token', async () => {
    repository.findUserByTokenHash.mockResolvedValue(user());
    repository.verifyEmail.mockResolvedValue(false);
    await expect(
      useCase.execute({ token: 'token-prueba' }),
    ).rejects.toBeInstanceOf(InvalidVerificationTokenError);
  });

  it('verifica un token válido', async () => {
    repository.findUserByTokenHash.mockResolvedValue(user());
    repository.verifyEmail.mockResolvedValue(true);
    await expect(
      useCase.execute({ token: 'token-prueba' }),
    ).resolves.toBeUndefined();
    expect(repository.findUserByTokenHash).toHaveBeenCalledWith(
      hashToken('token-prueba'),
    );
    expect(repository.verifyEmail).toHaveBeenCalledWith({
      userId: 'user-id',
      tokenHash: hashToken('token-prueba'),
    });
  });
});
