import { PersonaRepository } from '../../../persons/domain/repositories/persona.repository';
import { RolRepository } from '../../../persons/domain/repositories/rol.repository';
import { UbigeoRepository } from '../../../persons/domain/repositories/ubigeo.repository';
import { UserRepository } from '../../../persons/domain/repositories/user.repository';
import {
  CategoriaCliente,
  TipoCliente,
  TipoDocumento,
} from '../../../persons/domain/enums/persons.enums';
import {
  InvalidRequestError,
  ResourceConflictError,
} from '../../domain/errors/auth-domain.errors';
import { RegistroRepository } from '../../domain/repositories/registro.repository';
import { EmailService } from '../../domain/services/email.service';
import { RegisterClienteDto } from '../dto/register-cliente.dto';
import { RegisterClienteUseCase } from './register-cliente.use-case';

describe('RegisterClienteUseCase (HU-B-002)', () => {
  const existsByDocument = jest.fn();
  const existsByEmail = jest.fn();
  const existsByUsername = jest.fn();
  const findByName = jest.fn();
  const registerCliente = jest.fn();
  const sendVerificationEmail = jest.fn();
  const existsDistrito = jest.fn();

  const useCase = new RegisterClienteUseCase(
    { existsByDocument } as unknown as jest.Mocked<PersonaRepository>,
    {
      existsByEmail,
      existsByUsername,
    } as unknown as jest.Mocked<UserRepository>,
    { findByName } as unknown as jest.Mocked<RolRepository>,
    { registerCliente } as unknown as jest.Mocked<RegistroRepository>,
    { sendVerificationEmail } as unknown as jest.Mocked<EmailService>,
    { existsDistrito } as unknown as jest.Mocked<UbigeoRepository>,
  );

  const dto = (
    overrides: Partial<RegisterClienteDto> = {},
  ): RegisterClienteDto => ({
    nombres: 'Ana',
    apellido_paterno: 'Torres',
    apellido_materno: 'Vega',
    tipo_documento: TipoDocumento.DNI,
    numero_documento: '88112233',
    tipo_cliente: TipoCliente.PERSONA_NATURAL,
    categoria_cliente: CategoriaCliente.MINORISTA,
    email: 'ana@francos.test',
    username: 'anatorres',
    password: 'Clave1234',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    existsByDocument.mockResolvedValue(false);
    existsByEmail.mockResolvedValue(false);
    existsByUsername.mockResolvedValue(false);
    findByName.mockResolvedValue({ id: 3, nombre: 'cliente' });
    registerCliente.mockResolvedValue({
      user: { email: 'ana@francos.test' },
      persona: { nombres: 'Ana' },
    });
    sendVerificationEmail.mockResolvedValue(undefined);
    existsDistrito.mockResolvedValue(true);
  });

  it('registra a la persona sin verificar el correo y le envía la verificación', async () => {
    await useCase.execute(dto());

    expect(registerCliente).toHaveBeenCalledWith(
      expect.objectContaining({
        rol_id: 3,
        cliente: expect.objectContaining({
          tipo_cliente: TipoCliente.PERSONA_NATURAL,
        }) as object,
        user: expect.objectContaining({
          email_verificado: false,
          token_verificacion_email: expect.any(String) as string,
        }) as object,
      }),
    );
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'ana@francos.test', frontend: 'tienda' }),
    );
  });

  it('no revierte el registro si el correo de verificación falla', async () => {
    sendVerificationEmail.mockRejectedValue(new Error('SMTP caído'));

    await expect(useCase.execute(dto())).resolves.toBeDefined();
  });

  it.each([
    ['RUC 10 como persona natural', '10456789012', TipoCliente.PERSONA_NATURAL],
    ['RUC 20 como empresa', '20456789012', TipoCliente.EMPRESA],
  ])('acepta un %s', async (_, numero, tipoCliente) => {
    await useCase.execute(
      dto({
        tipo_documento: TipoDocumento.RUC,
        numero_documento: numero,
        tipo_cliente: tipoCliente,
        razon_social: 'Distribuidora El Sol S.A.C.',
      }),
    );

    expect(registerCliente).toHaveBeenCalled();
  });

  it.each([
    [
      'un DNI como empresa',
      { tipo_cliente: TipoCliente.EMPRESA },
      'Con este documento debes registrarte como persona natural',
    ],
    [
      'un RUC 20 como persona natural',
      { tipo_documento: TipoDocumento.RUC, numero_documento: '20456789012' },
      'Con un RUC 20 debes registrarte como empresa',
    ],
    [
      'un RUC que no empieza en 10 ni 20',
      { tipo_documento: TipoDocumento.RUC, numero_documento: '15456789012' },
      'El RUC debe empezar con 10 (persona natural) o con 20 (empresa)',
    ],
    [
      'una empresa sin razón social',
      {
        tipo_documento: TipoDocumento.RUC,
        numero_documento: '20456789012',
        tipo_cliente: TipoCliente.EMPRESA,
        razon_social: '  ',
      },
      'La razón social es obligatoria para una empresa',
    ],
    [
      'una fecha de nacimiento futura',
      { fecha_nacimiento: '2999-01-01' },
      'La fecha de nacimiento no puede ser futura',
    ],
  ])('rechaza %s (400)', async (_, overrides, mensaje) => {
    await expect(useCase.execute(dto(overrides))).rejects.toThrow(
      new InvalidRequestError(mensaje),
    );
    expect(registerCliente).not.toHaveBeenCalled();
  });

  it.each([
    [
      'el documento',
      existsByDocument,
      'Ya existe una cuenta con ese número de documento',
    ],
    [
      'el correo',
      existsByEmail,
      'Ya existe una cuenta con ese correo electrónico',
    ],
    [
      'el nombre de usuario',
      existsByUsername,
      'Ese nombre de usuario ya está en uso',
    ],
  ])('rechaza si %s ya está registrado (409)', async (_, mock, mensaje) => {
    mock.mockResolvedValue(true);

    await expect(useCase.execute(dto())).rejects.toThrow(
      new ResourceConflictError(mensaje),
    );
    expect(registerCliente).not.toHaveBeenCalled();
  });

  it('rechaza un distrito que no existe en el catálogo', async () => {
    existsDistrito.mockResolvedValue(false);

    await expect(
      useCase.execute(dto({ distrito_id: '999999' })),
    ).rejects.toBeInstanceOf(InvalidRequestError);
    expect(registerCliente).not.toHaveBeenCalled();
  });

  it('guarda el distrito de la persona cuando existe', async () => {
    await useCase.execute(dto({ distrito_id: '150131' }));

    expect(registerCliente).toHaveBeenCalledWith(
      expect.objectContaining({
        persona: expect.objectContaining({ distrito_id: '150131' }) as object,
      }),
    );
  });

  it('registra sin distrito y no consulta el catálogo', async () => {
    await useCase.execute(dto());

    expect(existsDistrito).not.toHaveBeenCalled();
    expect(registerCliente).toHaveBeenCalledWith(
      expect.objectContaining({
        persona: expect.objectContaining({ distrito_id: null }) as object,
      }),
    );
  });
});
