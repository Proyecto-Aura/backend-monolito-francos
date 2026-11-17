import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { NotificacionRepository } from '../../../domain/repositories/notificacion.repository';
import { ObtenerPreferenciasNotificacionUseCase } from './obtener-preferencias-notificacion.use-case';

describe('ObtenerPreferenciasNotificacionUseCase', () => {
  const USER_ID = 'a1b2c3d4-1111-4d2b-8b1f-4c6c3a7a0009';
  const findPreferencias = jest.fn();
  const repository = {
    findPreferencias,
  } as unknown as jest.Mocked<NotificacionRepository>;
  const useCase = new ObtenerPreferenciasNotificacionUseCase(repository);

  beforeEach(() => jest.clearAllMocks());

  it('devuelve las preferencias del usuario', async () => {
    findPreferencias.mockResolvedValue({ pedido_en_camino: false });

    await expect(useCase.execute(USER_ID)).resolves.toEqual({
      pedido_en_camino: false,
    });
    expect(findPreferencias).toHaveBeenCalledWith(USER_ID);
  });

  it('si el usuario ya no existe, devuelve 404', async () => {
    findPreferencias.mockResolvedValue(null);

    await expect(useCase.execute(USER_ID)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
  });
});
