import {
  CategoriaCliente,
  TipoCliente,
  TipoDocumento,
} from '../../../persons/domain/enums/persons.enums';
import { PersonaRepository } from '../../../persons/domain/repositories/persona.repository';
import { RolRepository } from '../../../persons/domain/repositories/rol.repository';
import { UbigeoRepository } from '../../../persons/domain/repositories/ubigeo.repository';
import { UserRepository } from '../../../persons/domain/repositories/user.repository';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../domain/errors/auth-domain.errors';
import { RegistroRepository } from '../../domain/repositories/registro.repository';
import { EmailService } from '../../domain/services/email.service';
import { RegisterClienteByStaffDto } from '../dto/register-cliente-by-staff.dto';
import { hashToken } from '../utils/token.util';
import { RegisterClienteByStaffUseCase } from './register-cliente-by-staff.use-case';

describe('RegisterClienteByStaffUseCase', () => {
  const existsByDocument = jest.fn();
  const existsByEmail = jest.fn();
  const existsByUsername = jest.fn();
  const findByName = jest.fn();
  const registerCliente = jest.fn();
  const sendClienteBienvenidaEmail = jest.fn();
  const sendVerificationEmail = jest.fn();
  const sendDefaultCredentialsEmail = jest.fn();
  const existsDistrito = jest.fn();
  const useCase = new RegisterClienteByStaffUseCase(
    { existsByDocument } as unknown as jest.Mocked<PersonaRepository>,
    {
      existsByEmail,
      existsByUsername,
    } as unknown as jest.Mocked<UserRepository>,
    { findByName } as unknown as jest.Mocked<RolRepository>,
    { registerCliente } as unknown as jest.Mocked<RegistroRepository>,
    {
      sendClienteBienvenidaEmail,
      sendVerificationEmail,
      sendDefaultCredentialsEmail,
    } as unknown as jest.Mocked<EmailService>,
    { existsDistrito } as unknown as jest.Mocked<UbigeoRepository>,
  );

  const dto = (): RegisterClienteByStaffDto => ({
    nombres: 'Ana',
    apellido_paterno: 'Torres',
    apellido_materno: 'Vega',
    tipo_documento: TipoDocumento.DNI,
    numero_documento: '12345678',
    tipo_cliente: TipoCliente.PERSONA_NATURAL,
    categoria_cliente: CategoriaCliente.MINORISTA,
    email: 'ana@francos.test',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    existsByDocument.mockResolvedValue(false);
    existsByEmail.mockResolvedValue(false);
    existsByUsername.mockResolvedValue(false);
    findByName.mockResolvedValue({ id: 1 });
    existsDistrito.mockResolvedValue(true);
    registerCliente.mockResolvedValue({
      user: { email: 'ana@francos.test' },
      persona: { nombres: 'Ana' },
    });
  });

  it('guarda hash y envía una sola bienvenida', async () => {
    await useCase.execute(dto());

    const [saved] = registerCliente.mock.calls[0] as [
      {
        user: {
          email_verificado: boolean;
          debe_cambiar_contrasena: boolean;
          username: string;
          token_verificacion_email: string;
        };
      },
    ];
    const [sent] = sendClienteBienvenidaEmail.mock.calls[0] as [
      {
        username: string;
        contrasenaDefault: string;
        verificationToken: string;
      },
    ];
    expect(saved.user).toMatchObject({
      email_verificado: false,
      debe_cambiar_contrasena: true,
      username: '12345678',
    });
    expect(saved.user.token_verificacion_email).toBe(
      hashToken(sent.verificationToken),
    );
    expect(sent).toMatchObject({
      username: '12345678',
      contrasenaDefault: '12345678',
    });
    expect(sendClienteBienvenidaEmail).toHaveBeenCalledTimes(1);
    expect(sendVerificationEmail).not.toHaveBeenCalled();
    expect(sendDefaultCredentialsEmail).not.toHaveBeenCalled();
  });

  it('registra como minorista si no se indica la categoría', async () => {
    const sinCategoria = dto();
    delete sinCategoria.categoria_cliente;

    await useCase.execute(sinCategoria);

    const [saved] = registerCliente.mock.calls[0] as [
      { cliente: { categoria_cliente: CategoriaCliente } },
    ];
    expect(saved.cliente.categoria_cliente).toBe(CategoriaCliente.MINORISTA);
  });

  it('respeta la categoría cuando sí se indica', async () => {
    await useCase.execute({
      ...dto(),
      categoria_cliente: CategoriaCliente.MAYORISTA,
    });

    const [saved] = registerCliente.mock.calls[0] as [
      { cliente: { categoria_cliente: CategoriaCliente } },
    ];
    expect(saved.cliente.categoria_cliente).toBe(CategoriaCliente.MAYORISTA);
  });

  it('no revierte si SMTP falla', async () => {
    sendClienteBienvenidaEmail.mockRejectedValue(new Error('SMTP'));

    await expect(useCase.execute(dto())).resolves.toBeDefined();
  });

  it.each(['documento', 'email'])('rechaza conflicto de %s', async (kind) => {
    if (kind === 'documento') existsByDocument.mockResolvedValue(true);
    else existsByEmail.mockResolvedValue(true);

    await expect(useCase.execute(dto())).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
  });

  it('requiere razón social y rol cliente', async () => {
    await expect(
      useCase.execute({
        ...dto(),
        tipo_cliente: TipoCliente.EMPRESA,
        razon_social: undefined,
      }),
    ).rejects.toBeInstanceOf(ResourceConflictError);
    findByName.mockResolvedValue(null);

    await expect(useCase.execute(dto())).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
  });
});
