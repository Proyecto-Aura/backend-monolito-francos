import { NotificacionRepository } from '../../../domain/repositories/notificacion.repository';
import { ListNotificacionesQueryDto } from '../../dto/notificacion-dtos/list-notificaciones-query.dto';
import { ListNotificacionesUseCase } from './list-notificaciones.use-case';

describe('ListNotificacionesUseCase', () => {
  const USER_ID = 'a1b2c3d4-1111-4d2b-8b1f-4c6c3a7a0009';
  const findManyDeUsuario = jest.fn();
  const repository = {
    findManyDeUsuario,
  } as unknown as jest.Mocked<NotificacionRepository>;
  const useCase = new ListNotificacionesUseCase(repository);

  beforeEach(() => jest.clearAllMocks());

  it('pasa la paginación y el filtro de leído al repositorio, con el userId del token', async () => {
    const resultado = { data: [], total: 0, page: 2, limit: 5 };
    findManyDeUsuario.mockResolvedValue(resultado);

    await expect(
      useCase.execute(
        Object.assign(new ListNotificacionesQueryDto(), {
          page: 2,
          limit: 5,
          leido: false,
        }),
        USER_ID,
      ),
    ).resolves.toBe(resultado);

    expect(findManyDeUsuario).toHaveBeenCalledWith(USER_ID, {
      page: 2,
      limit: 5,
      leido: false,
    });
  });

  it('sin filtro de leído lo manda como undefined (trae todas)', async () => {
    findManyDeUsuario.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    await useCase.execute(new ListNotificacionesQueryDto(), USER_ID);

    expect(findManyDeUsuario).toHaveBeenCalledWith(USER_ID, {
      page: 1,
      limit: 10,
      leido: undefined,
    });
  });
});
