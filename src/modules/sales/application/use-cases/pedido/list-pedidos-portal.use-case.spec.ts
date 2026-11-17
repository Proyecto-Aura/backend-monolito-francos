import { EstadoPedido } from '../../../domain/enums';
import { ResourceNotFoundError } from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { ListPedidosPortalQueryDto } from '../../dto/pedido-dtos/list-pedidos-portal-query.dto';
import { ListPedidosPortalUseCase } from './list-pedidos-portal.use-case';

describe('ListPedidosPortalUseCase', () => {
  const USER_ID = 'a1b2c3d4-1111-4d2b-8b1f-4c6c3a7a0009';
  const CLIENTE_ID = 'c1c1c1c1-2222-4d2b-8b1f-4c6c3a7a0001';

  const findClienteParaResumenPorUser = jest.fn();
  const findManyDeCliente = jest.fn();
  const pedidoRepository = {
    findClienteParaResumenPorUser,
    findManyDeCliente,
  } as unknown as jest.Mocked<PedidoRepository>;

  const useCase = new ListPedidosPortalUseCase(pedidoRepository);

  beforeEach(() => {
    jest.clearAllMocks();
    findClienteParaResumenPorUser.mockResolvedValue({
      id: CLIENTE_ID,
      estado: true,
      direccion: null,
    });
  });

  it('resuelve el cliente del usuario y pasa los filtros y la paginación', async () => {
    const resultado = { data: [], total: 0, page: 2, limit: 5 };
    findManyDeCliente.mockResolvedValue(resultado);

    await expect(
      useCase.execute(
        Object.assign(new ListPedidosPortalQueryDto(), {
          page: 2,
          limit: 5,
          estado: EstadoPedido.ENTREGADO,
        }),
        USER_ID,
      ),
    ).resolves.toBe(resultado);

    expect(findClienteParaResumenPorUser).toHaveBeenCalledWith(USER_ID);
    expect(findManyDeCliente).toHaveBeenCalledWith(CLIENTE_ID, {
      page: 2,
      limit: 5,
      estado: EstadoPedido.ENTREGADO,
    });
  });

  it('sin cliente para el usuario devuelve 404', async () => {
    findClienteParaResumenPorUser.mockResolvedValue(null);

    await expect(
      useCase.execute(new ListPedidosPortalQueryDto(), USER_ID),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(findManyDeCliente).not.toHaveBeenCalled();
  });

  it('no valida el estado del cliente: uno inactivo también ve su historial', async () => {
    findClienteParaResumenPorUser.mockResolvedValue({
      id: CLIENTE_ID,
      estado: false,
      direccion: null,
    });
    findManyDeCliente.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    await useCase.execute(new ListPedidosPortalQueryDto(), USER_ID);

    expect(findManyDeCliente).toHaveBeenCalled();
  });
});
