const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

jest.mock('../../../../config/envs', () => ({
  envs: {
    frontendStoreUrl: 'https://tienda.test',
    frontendPortalUrl: 'https://portal.test',
    smtpFrom: 'no-reply@francos.test',
    smtpHost: 'localhost',
    smtpPort: 1025,
    smtpSecure: false,
    smtpUser: 'u',
    smtpPass: 'p',
  },
}));

import { NodemailerEmailService } from './nodemailer-email.service';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

describe('NodemailerEmailService', () => {
  const canal = jest.fn();
  const plantilla = jest.fn();
  const prisma = {
    canalNotificacion: { findUnique: canal },
    plantillaNotificacion: { findUnique: plantilla },
  } as unknown as PrismaService;
  beforeEach(() => {
    mockSendMail.mockReset().mockResolvedValue(undefined);
    canal.mockReset().mockResolvedValue({ activo: true });
    plantilla.mockReset().mockResolvedValue(null);
  });

  it('envía el enlace de recuperación al portal y escapa el nombre en HTML', async () => {
    const service = new NodemailerEmailService(prisma);
    const token = 'token-de-recuperacion';

    await service.sendPasswordResetEmail({
      to: 'usuario@francos.test',
      nombre: '<script>alert(1)</script>',
      resetToken: token,
      frontend: 'portal',
    });

    const [message] = mockSendMail.mock.calls[0] as [
      { to: string; subject: string; html: string },
    ];
    expect(message.to).toBe('usuario@francos.test');
    expect(message.subject).toBe("Restablece tu contraseña — Franco's");
    expect(message.html).toContain(
      'https://portal.test/reset-password?token=token-de-recuperacion',
    );
    expect(message.html).not.toContain('https://tienda.test');
    expect(message.html).toContain(
      'Si no solicitaste este cambio, puedes ignorar este correo',
    );
    expect(message.html).toContain('El enlace vence en 1 hora');
    expect(message.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(message.html).not.toContain('<script>');
  });

  it('envía el enlace de recuperación a la tienda', async () => {
    const service = new NodemailerEmailService(prisma);

    await service.sendPasswordResetEmail({
      to: 'cliente@francos.test',
      nombre: 'Cliente',
      resetToken: 'token-tienda',
      frontend: 'tienda',
    });

    const [message] = mockSendMail.mock.calls[0] as [{ html: string }];
    expect(message.html).toContain(
      'https://tienda.test/reset-password?token=token-tienda',
    );
    expect(message.html).not.toContain('https://portal.test');
  });

  it('envía el enlace de cambio de correo a la dirección nueva y escapa el nombre', async () => {
    const service = new NodemailerEmailService(prisma);

    await service.sendEmailChangeVerificationEmail({
      to: 'nuevo@francos.test',
      nombre: '<b>Rosa</b>',
      token: 'token-cambio',
      frontend: 'tienda',
    });

    const [message] = mockSendMail.mock.calls[0] as [
      { to: string; subject: string; html: string },
    ];
    expect(message.to).toBe('nuevo@francos.test');
    expect(message.subject).toBe("Confirma tu nuevo correo — Franco's");
    expect(message.html).toContain(
      'https://tienda.test/verificar-cambio-email?token=token-cambio',
    );
    expect(message.html).not.toContain('https://portal.test');
    expect(message.html).toContain('El enlace vence en 1 hora');
    expect(message.html).toContain('Si no fuiste tú, ignora este correo');
    expect(message.html).toContain('&lt;b&gt;Rosa&lt;/b&gt;');
    expect(message.html).not.toContain('<b>Rosa</b>');
  });

  it('envía la verificación a la tienda', async () => {
    const service = new NodemailerEmailService(prisma);

    await service.sendVerificationEmail({
      to: 'cliente@francos.test',
      nombre: 'Cliente',
      verificationToken: 'token-tienda',
      frontend: 'tienda',
    });

    const [message] = mockSendMail.mock.calls[0] as [{ html: string }];
    expect(message.html).toContain(
      'https://tienda.test/verify-email?token=token-tienda',
    );
    expect(message.html).not.toContain('https://portal.test');
  });

  it('envía la verificación al portal', async () => {
    const service = new NodemailerEmailService(prisma);

    await service.sendVerificationEmail({
      to: 'empleado@francos.test',
      nombre: 'Empleado',
      verificationToken: 'token-portal',
      frontend: 'portal',
    });

    const [message] = mockSendMail.mock.calls[0] as [{ html: string }];
    expect(message.html).toContain(
      'https://portal.test/verify-email?token=token-portal',
    );
    expect(message.html).not.toContain('https://tienda.test');
  });

  it('envía una sola bienvenida de cliente con credenciales y enlace escapados', async () => {
    const service = new NodemailerEmailService(prisma);
    await service.sendClienteBienvenidaEmail({
      to: 'cliente@francos.test',
      nombre: '<script>alert(1)</script>',
      username: '<cliente>',
      contrasenaDefault: '<temporal>',
      verificationToken: 'token-bienvenida',
    });
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const [message] = mockSendMail.mock.calls[0] as [{ html: string }];
    expect(message.html).toContain(
      'https://tienda.test/verify-email?token=token-bienvenida',
    );
    expect(message.html).toContain('El enlace vence en 24 horas');
    expect(message.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(message.html).toContain('&lt;cliente&gt;');
    expect(message.html).toContain('&lt;temporal&gt;');
    expect(message.html).not.toContain('<script>');
  });
  const envios = [
    {
      clave: 'verificacion_email',
      enviar: (service: NodemailerEmailService) =>
        service.sendVerificationEmail({
          to: 'ana@francos.test',
          nombre: 'Ana',
          verificationToken: 'token',
          frontend: 'portal',
        }),
    },
    {
      clave: 'credenciales_usuario_interno',
      enviar: (service: NodemailerEmailService) =>
        service.sendDefaultCredentialsEmail({
          to: 'ana@francos.test',
          nombre: 'Ana',
          username: 'ana',
          contrasenaDefault: 'temporal',
        }),
    },
    {
      clave: 'bienvenida_cliente',
      enviar: (service: NodemailerEmailService) =>
        service.sendClienteBienvenidaEmail({
          to: 'ana@francos.test',
          nombre: 'Ana',
          username: 'ana',
          contrasenaDefault: 'temporal',
          verificationToken: 'token',
        }),
    },
    {
      clave: 'recuperar_contrasena',
      enviar: (service: NodemailerEmailService) =>
        service.sendPasswordResetEmail({
          to: 'ana@francos.test',
          nombre: 'Ana',
          resetToken: 'token',
          frontend: 'portal',
        }),
    },
  ];

  it.each(envios)(
    'lee e interpola la plantilla $clave de BD',
    async ({ clave, enviar }) => {
      plantilla.mockResolvedValue({
        asunto: 'Aviso para {{ nombre }} / {{nombre}}',
        cuerpo: '<p>Hola {{nombre}}</p>',
      });
      await enviar(new NodemailerEmailService(prisma));
      expect(plantilla).toHaveBeenCalledWith({ where: { clave } });
      expect(canal).toHaveBeenCalledWith({ where: { tipo: 'email' } });
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'no-reply@francos.test',
        to: 'ana@francos.test',
        subject: 'Aviso para Ana / Ana',
        html: '<p>Hola Ana</p>',
      });
    },
  );

  it.each(envios)(
    'omite $clave sin lanzar error con el canal apagado',
    async ({ enviar }) => {
      canal.mockResolvedValue({ activo: false });
      await expect(
        enviar(new NodemailerEmailService(prisma)),
      ).resolves.toBeUndefined();
      expect(mockSendMail).not.toHaveBeenCalled();
    },
  );

  it('el cambio de email usa texto fijo y tambien respeta el canal apagado', async () => {
    canal.mockResolvedValue({ activo: false });
    await new NodemailerEmailService(prisma).sendEmailChangeVerificationEmail({
      to: 'nuevo@test.com',
      nombre: 'Ana',
      token: 'token',
      frontend: 'portal',
    });
    expect(mockSendMail).not.toHaveBeenCalled();
    expect(plantilla).not.toHaveBeenCalled();
  });

  it('relee el canal en cada envio para aplicar un toggle sin reiniciar', async () => {
    canal
      .mockResolvedValueOnce({ activo: false })
      .mockResolvedValueOnce({ activo: true });
    const service = new NodemailerEmailService(prisma);
    await envios[0].enviar(service);
    expect(mockSendMail).not.toHaveBeenCalled();
    await envios[0].enviar(service);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  it('conserva el fallback si falta la fila del canal', async () => {
    canal.mockResolvedValue(null);
    await envios[0].enviar(new NodemailerEmailService(prisma));
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  it('interpola enlace y vigencia en recuperacion y conserva el escape HTML del nombre', async () => {
    plantilla.mockResolvedValue({
      asunto: 'Recuperar',
      cuerpo: '{{nombre}} {{ enlace }} {{vigencia}}',
    });
    await new NodemailerEmailService(prisma).sendPasswordResetEmail({
      to: 'ana@test.com',
      nombre: '<Ana>',
      resetToken: 'token',
      frontend: 'portal',
    });
    const [mensaje] = mockSendMail.mock.calls[0] as [{ html: string }];
    expect(mensaje.html).toBe(
      '&lt;Ana&gt; https://portal.test/reset-password?token=token 1 hora',
    );
  });

  it('interpola las credenciales y el enlace de bienvenida escapando sus valores', async () => {
    plantilla.mockResolvedValue({
      asunto: 'Bienvenida',
      cuerpo: '{{nombre}} {{username}} {{contrasena_temporal}} {{enlace}}',
    });
    await new NodemailerEmailService(prisma).sendClienteBienvenidaEmail({
      to: 'ana@test.com',
      nombre: '<Ana>',
      username: '<usuario>',
      contrasenaDefault: '<temporal>',
      verificationToken: 'token',
    });
    const [mensaje] = mockSendMail.mock.calls[0] as [{ html: string }];
    expect(mensaje.html).toBe(
      '&lt;Ana&gt; &lt;usuario&gt; &lt;temporal&gt; https://tienda.test/verify-email?token=token',
    );
  });

  it('propaga el fallo SMTP al llamador', async () => {
    const error = new Error('SMTP no disponible');
    mockSendMail.mockRejectedValue(error);
    await expect(
      envios[0].enviar(new NodemailerEmailService(prisma)),
    ).rejects.toBe(error);
  });
});
