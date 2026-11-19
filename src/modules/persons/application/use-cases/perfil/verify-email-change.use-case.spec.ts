import { hashToken } from '../../../../auth/application/utils/token.util';
import {
  InvalidEmailChangeTokenError,
  ResourceConflictError,
} from '../../../domain/errors/persons-domain.errors';
import { SolicitudCambioEmailEntity } from '../../../domain/entities/solicitud-cambio-email.entity';
import { SolicitudCambioEmailRepository } from '../../../domain/repositories/solicitud-cambio-email.repository';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { VerifyEmailChangeUseCase } from './verify-email-change.use-case';

const TOKEN = 'token-en-claro';
const TOKEN_HASH = hashToken(TOKEN);
const EMAIL_NUEVO = 'rosa.nueva@francos.test';
const INVALID_MESSAGE = 'El enlace no es válido o ya venció';

describe('VerifyEmailChangeUseCase (HU-B-016)', () => {
  const findByTokenHash = jest.fn();
  const deleteByUserId = jest.fn();
  const applyChange = jest.fn();
  const findById = jest.fn();
  const existsByEmail = jest.fn();

  const useCase = new VerifyEmailChangeUseCase(
    {
      findByTokenHash,
      deleteByUserId,
      applyChange,
    } as unknown as jest.Mocked<SolicitudCambioEmailRepository>,
    {
      findById,
      existsByEmail,
    } as unknown as jest.Mocked<UserRepository>,
  );

  const solicitud = (
    cambios: Partial<SolicitudCambioEmailEntity> = {},
  ): SolicitudCambioEmailEntity => ({
    id: 'solicitud-1',
    user_id: 'user-1',
    email_nuevo: EMAIL_NUEVO,
    token_hash: TOKEN_HASH,
    expira_at: new Date(Date.now() + 60 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
    ...cambios,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    findByTokenHash.mockResolvedValue(solicitud());
    findById.mockResolvedValue({ id: 'user-1', estado: true });
    existsByEmail.mockResolvedValue(false);
    applyChange.mockResolvedValue('ok');
  });

  it('aplica el cambio con el token hasheado', async () => {
    await useCase.execute({ token: TOKEN });

    expect(findByTokenHash).toHaveBeenCalledWith(TOKEN_HASH);
    expect(findByTokenHash).not.toHaveBeenCalledWith(TOKEN);
    expect(applyChange).toHaveBeenCalledWith('user-1', EMAIL_NUEVO, TOKEN_HASH);
    expect(deleteByUserId).not.toHaveBeenCalled();
  });

  it('rechaza un token inexistente (400)', async () => {
    findByTokenHash.mockResolvedValue(null);

    await expect(useCase.execute({ token: 'no-existe' })).rejects.toThrow(
      new InvalidEmailChangeTokenError(INVALID_MESSAGE),
    );
    expect(applyChange).not.toHaveBeenCalled();
  });

  it('rechaza un token vencido y borra la solicitud (400)', async () => {
    findByTokenHash.mockResolvedValue(
      solicitud({ expira_at: new Date(Date.now() - 1000) }),
    );

    await expect(useCase.execute({ token: TOKEN })).rejects.toThrow(
      new InvalidEmailChangeTokenError(INVALID_MESSAGE),
    );
    expect(deleteByUserId).toHaveBeenCalledWith('user-1');
    expect(applyChange).not.toHaveBeenCalled();
  });

  it('rechaza si el usuario ya no existe o está inactivo (400)', async () => {
    findById.mockResolvedValue(null);

    await expect(useCase.execute({ token: TOKEN })).rejects.toThrow(
      new InvalidEmailChangeTokenError(INVALID_MESSAGE),
    );
    expect(deleteByUserId).toHaveBeenCalledWith('user-1');
  });

  it('rechaza si otra cuenta tomó el correo y borra la solicitud (409)', async () => {
    existsByEmail.mockResolvedValue(true);

    await expect(useCase.execute({ token: TOKEN })).rejects.toThrow(
      new ResourceConflictError('Ese correo ya está registrado en otra cuenta'),
    );
    expect(deleteByUserId).toHaveBeenCalledWith('user-1');
    expect(applyChange).not.toHaveBeenCalled();
  });

  it('rechaza si el token se consumió en paralelo (400)', async () => {
    applyChange.mockResolvedValue('token_invalido');

    await expect(useCase.execute({ token: TOKEN })).rejects.toThrow(
      new InvalidEmailChangeTokenError(INVALID_MESSAGE),
    );
  });

  it('rechaza si el correo se ocupó durante la confirmación (409)', async () => {
    applyChange.mockResolvedValue('email_en_uso');

    await expect(useCase.execute({ token: TOKEN })).rejects.toThrow(
      new ResourceConflictError('Ese correo ya está registrado en otra cuenta'),
    );
    expect(deleteByUserId).toHaveBeenCalledWith('user-1');
  });
});
