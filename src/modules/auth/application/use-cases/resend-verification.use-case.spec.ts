import { EmailService } from '../../domain/services/email.service';
import { EmailVerificationRepository } from '../../domain/repositories/email-verification.repository';
import { UserRepository } from '../../../persons/domain/repositories/user.repository';
import { PersonaRepository } from '../../../persons/domain/repositories/persona.repository';
import { UsuarioRolRepository } from '../../../persons/domain/repositories/usuario-rol.repository';
import { UserEntity } from '../../../persons/domain/entities/user.entity';
import { hashToken } from '../utils/token.util';
import { ResendVerificationUseCase } from './resend-verification.use-case';

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
      null,
      null,
      null,
      null,
      new Date(),
      new Date(),
    ),
    overrides,
  );
}

describe('ResendVerificationUseCase', () => {
  const users = { findByEmail: jest.fn() };
  const personas = { findById: jest.fn() };
  const roles = { findRolesByUserId: jest.fn() };
  const verification = { saveToken: jest.fn() };
  const emails = { sendVerificationEmail: jest.fn() };
  const useCase = new ResendVerificationUseCase(
    users as unknown as UserRepository,
    personas as unknown as PersonaRepository,
    roles as unknown as UsuarioRolRepository,
    verification as unknown as EmailVerificationRepository,
    emails as unknown as EmailService,
  );
  beforeEach(() => {
    jest.clearAllMocks();
    personas.findById.mockResolvedValue({ nombres: 'Ana' });
    roles.findRolesByUserId.mockResolvedValue([{ nombre: 'cliente' }]);
  });

  it.each([null, user({ estado: false }), user({ email_verificado: true })])(
    'no envía para una cuenta no elegible',
    async (found) => {
      users.findByEmail.mockResolvedValue(found);
      await useCase.execute({ email: 'usuario@francos.test' });
      expect(verification.saveToken).not.toHaveBeenCalled();
    },
  );
  it('respeta el cooldown', async () => {
    users.findByEmail.mockResolvedValue(
      user({
        token_verificacion_email_expiracion: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ),
      }),
    );
    await useCase.execute({ email: 'usuario@francos.test' });
    expect(emails.sendVerificationEmail).not.toHaveBeenCalled();
  });
  it('guarda hash y envía el token en claro al destino de cliente', async () => {
    users.findByEmail.mockResolvedValue(user());
    await useCase.execute({ email: 'usuario@francos.test' });
    const [, hash] = verification.saveToken.mock.calls[0] as [string, string];
    const [email] = emails.sendVerificationEmail.mock.calls[0] as [
      { verificationToken: string; frontend: string },
    ];
    expect(hash).toBe(hashToken(email.verificationToken));
    expect(hash).not.toBe(email.verificationToken);
    expect(email.frontend).toBe('tienda');
  });
  it('no falla si SMTP falla y resuelve portal para staff', async () => {
    users.findByEmail.mockResolvedValue(user());
    roles.findRolesByUserId.mockResolvedValue([{ nombre: 'ventas' }]);
    emails.sendVerificationEmail.mockRejectedValue(new Error('SMTP caído'));
    await expect(
      useCase.execute({ email: 'usuario@francos.test' }),
    ).resolves.toBeUndefined();
    expect(emails.sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ frontend: 'portal' }),
    );
  });
  it.each([new Date(Date.now() - 1), null])(
    'reenvía si la expiración anterior no está en cooldown',
    async (expiracion) => {
      users.findByEmail.mockResolvedValue(
        user({ token_verificacion_email_expiracion: expiracion }),
      );
      await useCase.execute({ email: 'usuario@francos.test' });
      expect(verification.saveToken).toHaveBeenCalled();
    },
  );
});
