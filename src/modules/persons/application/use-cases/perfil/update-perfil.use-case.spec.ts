import { hashToken } from '../../../../auth/application/utils/token.util';
import { EmailService } from '../../../../auth/domain/services/email.service';
import {
  InvalidRequestError,
  ResourceConflictError,
} from '../../../domain/errors/persons-domain.errors';
import { SolicitudCambioEmailEntity } from '../../../domain/entities/solicitud-cambio-email.entity';
import { SolicitudCambioEmailRepository } from '../../../domain/repositories/solicitud-cambio-email.repository';
import { UbigeoRepository } from '../../../domain/repositories/ubigeo.repository';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { GetPerfilUseCase, PerfilCliente } from './get-perfil.use-case';
import { UpdatePerfilUseCase } from './update-perfil.use-case';

const EMAIL_ACTUAL = 'rosa@francos.test';
const EMAIL_NUEVO = 'rosa.nueva@francos.test';

describe('UpdatePerfilUseCase (HU-B-015 / HU-B-016)', () => {
  const perfil = {
    user: { id: 'user-1', email: EMAIL_ACTUAL },
    persona: { id: 'persona-1', nombres: 'Rosa' },
    cliente: null,
  } as unknown as PerfilCliente;

  const existsByEmail = jest.fn();
  const updateWithPersona = jest.fn();
  const findByUserId = jest.fn();
  const save = jest.fn();
  const deleteByUserId = jest.fn();
  const sendEmailChangeVerificationEmail = jest.fn();
  const getPerfil = { execute: jest.fn() };
  const existsDistrito = jest.fn();

  const useCase = new UpdatePerfilUseCase(
    {
      existsByEmail,
      updateWithPersona,
    } as unknown as jest.Mocked<UserRepository>,
    {
      findByUserId,
      save,
      deleteByUserId,
    } as unknown as jest.Mocked<SolicitudCambioEmailRepository>,
    {
      sendEmailChangeVerificationEmail,
    } as unknown as jest.Mocked<EmailService>,
    getPerfil as unknown as GetPerfilUseCase,
    { existsDistrito } as unknown as jest.Mocked<UbigeoRepository>,
  );

  const solicitud = (
    cambios: Partial<SolicitudCambioEmailEntity> = {},
  ): SolicitudCambioEmailEntity => ({
    id: 'solicitud-1',
    user_id: 'user-1',
    email_nuevo: EMAIL_NUEVO,
    token_hash: 'hash-viejo',
    expira_at: new Date(Date.now() + 60 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
    ...cambios,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getPerfil.execute.mockResolvedValue(perfil);
    existsByEmail.mockResolvedValue(false);
    existsDistrito.mockResolvedValue(true);
    findByUserId.mockResolvedValue(null);
    sendEmailChangeVerificationEmail.mockResolvedValue(undefined);
  });

  it('con email nuevo no lo aplica: guarda el hash y envía el correo al nuevo', async () => {
    const resultado = await useCase.execute('user-1', {
      email: `  ${EMAIL_NUEVO.toUpperCase()}  `,
    });

    expect(save).toHaveBeenCalledTimes(1);
    const [userId, emailNuevo, tokenHash] = save.mock.calls[0] as [
      string,
      string,
      string,
    ];
    const [[enviado]] = sendEmailChangeVerificationEmail.mock
      .calls as unknown as [
      [{ token: string; to: string; nombre: string; frontend: string }],
    ];
    expect(userId).toBe('user-1');
    expect(emailNuevo).toBe(EMAIL_NUEVO);
    expect(tokenHash).not.toBe(enviado.token);
    expect(tokenHash).toBe(hashToken(enviado.token));
    expect(enviado.to).toBe(EMAIL_NUEVO);
    expect(enviado.nombre).toBe('Rosa');
    expect(enviado.frontend).toBe('tienda');

    // El email actual de la cuenta no se toca.
    expect(updateWithPersona).not.toHaveBeenCalled();
    expect(resultado.cambioEmailPendiente).toBe(true);
  });

  it('aplica nombres y teléfono en la misma petición aunque el email quede pendiente', async () => {
    await useCase.execute('user-1', {
      email: EMAIL_NUEVO,
      nombres: 'Rosa María',
      telefono: '912345678',
    });

    expect(updateWithPersona).toHaveBeenCalledWith(
      'user-1',
      {},
      { nombres: 'Rosa María', telefono: '912345678' },
    );
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('si el email es el mismo (normalizado) no envía ni guarda nada', async () => {
    const resultado = await useCase.execute('user-1', {
      email: `  ${EMAIL_ACTUAL.toUpperCase()} `,
    });

    expect(existsByEmail).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(sendEmailChangeVerificationEmail).not.toHaveBeenCalled();
    expect(resultado.cambioEmailPendiente).toBe(false);
  });

  it('rechaza un email que ya usa otra cuenta (409) y no guarda nada', async () => {
    existsByEmail.mockResolvedValue(true);

    await expect(
      useCase.execute('user-1', { email: 'otro@francos.test' }),
    ).rejects.toThrow(
      new ResourceConflictError('Ese correo ya está registrado en otra cuenta'),
    );
    expect(save).not.toHaveBeenCalled();
    expect(sendEmailChangeVerificationEmail).not.toHaveBeenCalled();
  });

  it('dentro del cooldown no reenvía y mantiene el pendiente', async () => {
    findByUserId.mockResolvedValue(
      solicitud({ created_at: new Date(Date.now() - 10 * 1000) }),
    );

    const resultado = await useCase.execute('user-1', { email: EMAIL_NUEVO });

    expect(save).not.toHaveBeenCalled();
    expect(sendEmailChangeVerificationEmail).not.toHaveBeenCalled();
    expect(resultado.cambioEmailPendiente).toBe(true);
  });

  it('fuera del cooldown reemplaza la solicitud con un token nuevo', async () => {
    findByUserId.mockResolvedValue(
      solicitud({ created_at: new Date(Date.now() - 61 * 1000) }),
    );

    await useCase.execute('user-1', { email: EMAIL_NUEVO });

    expect(save).toHaveBeenCalledTimes(1);
    expect(sendEmailChangeVerificationEmail).toHaveBeenCalledTimes(1);
  });

  it('descarta una solicitud vencida y envía una nueva', async () => {
    findByUserId.mockResolvedValue(
      solicitud({ expira_at: new Date(Date.now() - 1000) }),
    );

    const resultado = await useCase.execute('user-1', { email: EMAIL_NUEVO });

    expect(deleteByUserId).toHaveBeenCalledWith('user-1');
    expect(save).toHaveBeenCalledTimes(1);
    expect(resultado.cambioEmailPendiente).toBe(true);
  });

  it('si falla el envío del correo, el PATCH no se rompe', async () => {
    sendEmailChangeVerificationEmail.mockRejectedValue(new Error('SMTP caído'));

    const resultado = await useCase.execute('user-1', { email: EMAIL_NUEVO });

    expect(save).toHaveBeenCalledTimes(1);
    expect(resultado.cambioEmailPendiente).toBe(true);
  });

  describe('dirección de entrega (HU-B-018 / RF-B46)', () => {
    it('guarda la dirección y el distrito en la persona', async () => {
      await useCase.execute('user-1', {
        direccion: 'Av. Los Girasoles 123',
        distrito_id: '150131',
      });

      expect(existsDistrito).toHaveBeenCalledWith('150131');
      expect(updateWithPersona).toHaveBeenCalledWith(
        'user-1',
        {},
        {
          nombres: undefined,
          telefono: undefined,
          direccion: 'Av. Los Girasoles 123',
          distrito_id: '150131',
        },
      );
    });

    it('solo la dirección, sin distrito, no consulta el catálogo', async () => {
      await useCase.execute('user-1', { direccion: 'Jr. Lima 45' });

      expect(existsDistrito).not.toHaveBeenCalled();
      expect(updateWithPersona).toHaveBeenCalledTimes(1);
    });

    it('rechaza un distrito que no existe y no guarda nada', async () => {
      existsDistrito.mockResolvedValue(false);

      await expect(
        useCase.execute('user-1', { distrito_id: '999999' }),
      ).rejects.toBeInstanceOf(InvalidRequestError);
      expect(updateWithPersona).not.toHaveBeenCalled();
    });
  });
});
