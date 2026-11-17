import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { NotificacionRepository } from '../../../domain/repositories/notificacion.repository';
import { ActualizarPreferenciasNotificacionUseCase } from './actualizar-preferencias-notificacion.use-case';

describe('ActualizarPreferenciasNotificacionUseCase', () => {
  const USER_ID = 'a1b2c3d4-1111-4d2b-8b1f-4c6c3a7a0009';
  const actualizarPreferencias = jest.fn();
  const repository = {
    actualizarPreferencias,
  } as unknown as jest.Mocked<NotificacionRepository>;
  const useCase = new ActualizarPreferenciasNotificacionUseCase(repository);

  beforeEach(() => jest.clearAllMocks());

  it('guarda la preferencia y la devuelve', async () => {
    actualizarPreferencias.mockResolvedValue(true);

    await expect(
      useCase.execute(USER_ID, { pedido_en_camino: false }),
    ).resolves.toEqual({ pedido_en_camino: false });
    expect(actualizarPreferencias).toHaveBeenCalledWith(USER_ID, {
      pedido_en_camino: false,
    });
  });

  it('si el usuario ya no existe, devuelve 404', async () => {
    actualizarPreferencias.mockResolvedValue(false);

    await expect(
      useCase.execute(USER_ID, { pedido_en_camino: true }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });
});
