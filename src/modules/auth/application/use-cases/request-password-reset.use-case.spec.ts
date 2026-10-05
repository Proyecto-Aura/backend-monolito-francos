import { EmailService } from '../../domain/services/email.service';
import { PasswordResetRepository } from '../../domain/repositories/password-reset.repository';
import { UserRepository } from '../../../persons/domain/repositories/user.repository';
import { UserEntity } from '../../../persons/domain/entities/user.entity';
import { PersonaRepository } from '../../../persons/domain/repositories/persona.repository';
import { hashToken } from '../utils/token.util';
import { RequestPasswordResetUseCase } from './request-password-reset.use-case';

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
    null,
    null,
    new Date(),
    new Date(),
  );
  return Object.assign(user, overrides);
}

describe('RequestPasswordResetUseCase', () => {
  const userRepository = {
    findByEmail: jest.fn(),
  };
  const passwordResetRepository = {
    saveToken: jest.fn(),
  };
  const personaRepository = {
    findById: jest.fn(),
  };
  const emailService = {
    sendPasswordResetEmail: jest.fn(),
  };
  const useCase = new RequestPasswordResetUseCase(
    userRepository as unknown as UserRepository,
    personaRepository as unknown as PersonaRepository,
    passwordResetRepository as unknown as PasswordResetRepository,
    emailService as unknown as EmailService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no hace nada cuando el correo no existe', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'inexistente@francos.test' }),
    ).resolves.toBeUndefined();
    expect(passwordResetRepository.saveToken).not.toHaveBeenCalled();
    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('no hace nada cuando el usuario está inactivo', async () => {
    userRepository.findByEmail.mockResolvedValue(createUser({ estado: false }));

    await useCase.execute({ email: 'usuario@francos.test' });

    expect(passwordResetRepository.saveToken).not.toHaveBeenCalled();
    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('guarda el hash y envía el token en claro por correo', async () => {
    const user = createUser();
    userRepository.findByEmail.mockResolvedValue(user);
    passwordResetRepository.saveToken.mockResolvedValue(undefined);
    personaRepository.findById.mockResolvedValue({ nombres: 'María' });
    emailService.sendPasswordResetEmail.mockResolvedValue(undefined);

    await useCase.execute({ email: user.email });

    const [, tokenHash, expiresAt] = passwordResetRepository.saveToken.mock
      .calls[0] as [string, string, Date];
    const [emailParams] = emailService.sendPasswordResetEmail.mock.calls[0] as [
      { to: string; nombre: string; resetToken: string },
    ];
    expect(tokenHash).toBe(hashToken(emailParams.resetToken));
    expect(tokenHash).not.toBe(emailParams.resetToken);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(emailParams).toMatchObject({
      to: user.email,
      nombre: 'María',
    });
  });

  it('no falla si SMTP no responde', async () => {
    const user = createUser();
    userRepository.findByEmail.mockResolvedValue(user);
    passwordResetRepository.saveToken.mockResolvedValue(undefined);
    personaRepository.findById.mockResolvedValue(null);
    emailService.sendPasswordResetEmail.mockRejectedValue(
      new Error('SMTP caído'),
    );

    await expect(
      useCase.execute({ email: user.email }),
    ).resolves.toBeUndefined();
    expect(passwordResetRepository.saveToken).toHaveBeenCalledTimes(1);
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'usuario' }),
    );
  });

  it('no reenvía mientras el enlace anterior tiene menos de 60 segundos', async () => {
    userRepository.findByEmail.mockResolvedValue(
      createUser({ token_expiracion: new Date(Date.now() + 60 * 60 * 1000) }),
    );

    await useCase.execute({ email: 'usuario@francos.test' });

    expect(passwordResetRepository.saveToken).not.toHaveBeenCalled();
    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});
