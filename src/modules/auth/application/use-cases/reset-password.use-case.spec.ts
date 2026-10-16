import { comparePassword } from '../utils/password.util';
import { PasswordResetRepository } from '../../domain/repositories/password-reset.repository';
import { UserEntity } from '../../../persons/domain/entities/user.entity';
import { InvalidResetTokenError } from '../../domain/errors/auth-domain.errors';
import { ResetPasswordUseCase } from './reset-password.use-case';

function createUser(overrides: Partial<UserEntity> = {}): UserEntity {
  const user = new UserEntity(
    'user-id',
    'persona-id',
    'usuario@francos.test',
    'usuario',
    'password-hash',
    true,
    true,
    false,
    null,
    null,
    'token-hash',
    new Date(Date.now() + 60 * 60 * 1000),
    new Date(),
    new Date(),
  );
  return Object.assign(user, overrides);
}

describe('ResetPasswordUseCase', () => {
  const passwordResetRepository = {
    findUserByTokenHash: jest.fn(),
    resetPassword: jest.fn(),
  };
  const useCase = new ResetPasswordUseCase(
    passwordResetRepository as unknown as PasswordResetRepository,
  );
  const dto = {
    token: 'token-en-claro',
    nueva_contrasena: 'ClaveSegura123',
    confirmar_contrasena: 'ClaveSegura123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rechaza un token inexistente', async () => {
    passwordResetRepository.findUserByTokenHash.mockResolvedValue(null);

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      InvalidResetTokenError,
    );
  });

  it('rechaza un token expirado', async () => {
    passwordResetRepository.findUserByTokenHash.mockResolvedValue(
      createUser({ token_expiracion: new Date(Date.now() - 1) }),
    );

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      InvalidResetTokenError,
    );
  });

  it('rechaza un usuario inactivo', async () => {
    passwordResetRepository.findUserByTokenHash.mockResolvedValue(
      createUser({ estado: false }),
    );

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      InvalidResetTokenError,
    );
  });

  it('rechaza el token si fue consumido antes de la transacción', async () => {
    passwordResetRepository.findUserByTokenHash.mockResolvedValue(createUser());
    passwordResetRepository.resetPassword.mockResolvedValue(false);

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      InvalidResetTokenError,
    );
  });

  it('guarda la nueva contraseña con bcrypt', async () => {
    passwordResetRepository.findUserByTokenHash.mockResolvedValue(createUser());
    passwordResetRepository.resetPassword.mockResolvedValue(true);

    await expect(useCase.execute(dto)).resolves.toBeUndefined();

    const [params] = passwordResetRepository.resetPassword.mock.calls[0] as [
      { userId: string; tokenHash: string; contrasenaHash: string },
    ];
    expect(params.contrasenaHash).not.toBe(dto.nueva_contrasena);
    await expect(
      comparePassword(dto.nueva_contrasena, params.contrasenaHash),
    ).resolves.toBe(true);
  });
});
