import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { NotificacionRepository } from '../../../domain/repositories/notificacion.repository';
import { MarcarNotificacionLeidaUseCase } from './marcar-notificacion-leida.use-case';

describe('MarcarNotificacionLeidaUseCase', () => {
  const USER_ID = 'a1b2c3d4-1111-4d2b-8b1f-4c6c3a7a0009';
  const marcarLeida = jest.fn();
  const repository = {
    marcarLeida,
  } as unknown as jest.Mocked<NotificacionRepository>;
  const useCase = new MarcarNotificacionLeidaUseCase(repository);

  beforeEach(() => jest.clearAllMocks());

  it('marca la notificación como leída', async () => {
    marcarLeida.mockResolvedValue(true);

    await expect(useCase.execute(7, USER_ID)).resolves.toBeUndefined();
    expect(marcarLeida).toHaveBeenCalledWith(7, USER_ID);
  });

  it('si no existe, no es del usuario, o ya estaba leída, devuelve 404', async () => {
    marcarLeida.mockResolvedValue(false);

    await expect(useCase.execute(7, USER_ID)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
  });
});
