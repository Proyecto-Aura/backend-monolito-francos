import { AreaEmpleado, TipoDocumento } from '@prisma/client';
import { PersonaRepository } from '../../../persons/domain/repositories/persona.repository';
import { RolRepository } from '../../../persons/domain/repositories/rol.repository';
import { UserRepository } from '../../../persons/domain/repositories/user.repository';
import { RegistroRepository } from '../../domain/repositories/registro.repository';
import { EmailService } from '../../domain/services/email.service';
import { RegisterEmpleadoDto } from '../dto/register-empleado.dto';
import { hashToken } from '../utils/token.util';
import { RegisterEmpleadoUseCase } from './register-empleado.use-case';

describe('RegisterEmpleadoUseCase', () => {
  const existsByDocument = jest.fn();
  const existsByEmail = jest.fn();
  const existsByUsername = jest.fn();
  const findById = jest.fn();
  const registerEmpleado = jest.fn();
  const sendDefaultCredentialsEmail = jest.fn();
  const sendVerificationEmail = jest.fn();
  const useCase = new RegisterEmpleadoUseCase(
    { existsByDocument } as unknown as jest.Mocked<PersonaRepository>,
    {
      existsByEmail,
      existsByUsername,
    } as unknown as jest.Mocked<UserRepository>,
    { findById } as unknown as jest.Mocked<RolRepository>,
    { registerEmpleado } as unknown as jest.Mocked<RegistroRepository>,
    {
      sendDefaultCredentialsEmail,
      sendVerificationEmail,
    } as unknown as jest.Mocked<EmailService>,
  );
  const dto: RegisterEmpleadoDto = {
    nombres: 'Ana',
    apellido_paterno: 'Torres',
    apellido_materno: 'Vega',
    tipo_documento: TipoDocumento.dni,
    numero_documento: '12345678',
    cargo: 'Ventas',
    area: AreaEmpleado.ventas,
    email: 'ana@francos.test',
    rol_id: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    existsByDocument.mockResolvedValue(false);
    existsByEmail.mockResolvedValue(false);
    existsByUsername.mockResolvedValue(false);
    findById.mockResolvedValue({ id: 2, estado: true });
    registerEmpleado.mockResolvedValue({
      user: { email: dto.email },
      persona: { nombres: 'Ana' },
    });
  });

  it('guarda hash y envía credenciales más enlace portal', async () => {
    await useCase.execute(dto);

    const [saved] = registerEmpleado.mock.calls[0] as [
      { user: { token_verificacion_email: string } },
    ];
    const [sent] = sendVerificationEmail.mock.calls[0] as [
      { verificationToken: string; frontend: string },
    ];
    expect(saved.user.token_verificacion_email).toBe(
      hashToken(sent.verificationToken),
    );
    expect(sent.frontend).toBe('portal');
    expect(sendDefaultCredentialsEmail).toHaveBeenCalled();
  });

  it('no revierte ante SMTP caído', async () => {
    sendDefaultCredentialsEmail.mockRejectedValue(new Error('SMTP'));

    await expect(useCase.execute(dto)).resolves.toBeDefined();
  });
});
