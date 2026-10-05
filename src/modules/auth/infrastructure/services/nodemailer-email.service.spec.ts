const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

jest.mock('../../../../config/envs', () => ({
  envs: {
    frontendUrl: 'http://localhost:4200',
    smtpFrom: 'no-reply@francos.test',
    smtpHost: 'localhost',
    smtpPort: 1025,
    smtpSecure: false,
    smtpUser: 'u',
    smtpPass: 'p',
  },
}));

import { NodemailerEmailService } from './nodemailer-email.service';

describe('NodemailerEmailService', () => {
  beforeEach(() => {
    mockSendMail.mockReset();
  });

  it('envía el enlace de recuperación y escapa el nombre en HTML', async () => {
    const service = new NodemailerEmailService();
    const token = 'token-de-recuperacion';

    await service.sendPasswordResetEmail({
      to: 'usuario@francos.test',
      nombre: '<script>alert(1)</script>',
      resetToken: token,
    });

    const [message] = mockSendMail.mock.calls[0] as [
      { to: string; subject: string; html: string },
    ];
    expect(message.to).toBe('usuario@francos.test');
    expect(message.subject).toBe("Restablece tu contraseña — Franco's");
    expect(message.html).toContain(
      'http://localhost:4200/reset-password?token=token-de-recuperacion',
    );
    expect(message.html).toContain(
      'Si no solicitaste este cambio, puedes ignorar este correo',
    );
    expect(message.html).toContain('El enlace vence en 1 hora');
    expect(message.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(message.html).not.toContain('<script>');
  });
});
