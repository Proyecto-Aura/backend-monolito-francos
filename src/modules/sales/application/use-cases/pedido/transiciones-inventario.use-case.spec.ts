import { DetallePedidoEntity, PedidoEntity } from '../../../domain/entities';
import { RegistrarSalidaProductoTerminadoUseCase } from '../../../../inventory/application/use-cases/movimiento-producto-terminado/registrar-salida-producto-terminado.use-case';
import { ResourceConflictError as StockConflictError } from '../../../../catalog/domain/errors/catalog-domain.errors';
import { EstadoPedido, OrigenPedido, TipoEntrega } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
  InvalidRequestError,
} from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { PedidoDetalle } from '../../../domain/repositories/types/pedido-repository.types';
import { EntregarPedidoADespachoUseCase } from './entregar-pedido-a-despacho.use-case';
import { PrepararPedidoUseCase } from './preparar-pedido.use-case';

describe.each([
  {
    nombre: 'PrepararPedidoUseCase',
    clase: PrepararPedidoUseCase,
    desde: EstadoPedido.EN_ESPERA_INVENTARIO,
    hasta: EstadoPedido.EN_PREPARACION,
  },
])('$nombre', ({ clase, desde, hasta }) => {
  const findById = jest.fn();
  const cambiarEstado = jest.fn();
  const findDetalleById = jest.fn();
  const repository = {
    findById,
    cambiarEstado,
    findDetalleById,
  } as unknown as PedidoRepository;
  const useCase = new clase(repository);
  const fecha = new Date('2026-10-31T12:00:00Z');
  const pedido = new PedidoEntity(
    7,
    'E2E-260-007',
    'cliente-id',
    null,
    OrigenPedido.MANUAL,
    desde,
    TipoEntrega.DELIVERY,
    'Lima',
    80,
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    findById.mockResolvedValue(pedido);
    cambiarEstado.mockResolvedValue(true);
  });

  it('actualiza desde el estado esperado y devuelve el detalle actualizado', async () => {
    const detalle = {
      pedido: { ...pedido, estado: hasta },
      detalles: [],
      pago: null,
      cliente_nombre: 'Cliente Prueba',
    };
    findDetalleById.mockResolvedValue(detalle);
    await expect(useCase.execute(7)).resolves.toBe(detalle);
    expect(findById).toHaveBeenCalledWith(7);
    expect(cambiarEstado).toHaveBeenCalledTimes(1);
    expect(cambiarEstado).toHaveBeenCalledWith(7, desde, hasta);
    expect(findDetalleById).toHaveBeenCalledWith(7);
  });

  it.each(Object.values(EstadoPedido).filter((estado) => estado !== desde))(
    'rechaza el estado %s sin escribir ni leer el detalle',
    async (estado) => {
      findById.mockResolvedValue({ ...pedido, estado });
      await expect(useCase.execute(7)).rejects.toBeInstanceOf(
        ResourceConflictError,
      );
      expect(cambiarEstado).not.toHaveBeenCalled();
      expect(findDetalleById).not.toHaveBeenCalled();
    },
  );

  it('devuelve 404 sin escribir si el pedido no existe', async () => {
    findById.mockResolvedValue(null);
    await expect(useCase.execute(99)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(cambiarEstado).not.toHaveBeenCalled();
    expect(findDetalleById).not.toHaveBeenCalled();
  });

  it('devuelve 409 si otra operación cambió el estado antes de actualizar', async () => {
    cambiarEstado.mockResolvedValue(false);
    await expect(useCase.execute(7)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(cambiarEstado).toHaveBeenCalledWith(7, desde, hasta);
    expect(findDetalleById).not.toHaveBeenCalled();
  });

  it('devuelve 404 si desaparece el detalle después de actualizar', async () => {
    findDetalleById.mockResolvedValue(null);
    await expect(useCase.execute(7)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(cambiarEstado).toHaveBeenCalledTimes(1);
  });
});

describe('EntregarPedidoADespachoUseCase con items preparados', () => {
  const findById = jest.fn();
  const findDetalleById = jest.fn();
  const cambiarEstado = jest.fn();
  const executeMany = jest.fn();
  const repository = {
    findById,
    findDetalleById,
    cambiarEstado,
  } as unknown as PedidoRepository;
  const salida = {
    executeMany,
  } as unknown as RegistrarSalidaProductoTerminadoUseCase;
  const useCase = new EntregarPedidoADespachoUseCase(repository, salida);
  const fecha = new Date('2026-11-01T12:00:00Z');
  const pedido = new PedidoEntity(
    7,
    'E2E-260-007',
    'cliente-id',
    null,
    OrigenPedido.MANUAL,
    EstadoPedido.EN_PREPARACION,
    TipoEntrega.DELIVERY,
    'Lima',
    80,
    fecha,
    fecha,
  );
  const detalle: PedidoDetalle = {
    pedido,
    cliente_nombre: 'Cliente Prueba',
    pago: null,
    detalles: [101, 102].map((id, i) => ({
      detalle: new DetallePedidoEntity(
        i + 1,
        7,
        id,
        i === 0 ? 3 : 5,
        10,
        10,
        i === 0 ? 30 : 50,
        fecha,
      ),
      sku: `SKU-${id}`,
      producto_nombre: 'Producto Prueba',
      presentacion: '250 gr',
      stock_disponible: 20,
      producto_terminado_id: 501 + i,
    })),
  };
  const items = [
    { producto_presentacion_id: 102, cantidad_preparada: 9 },
    { producto_presentacion_id: 101, cantidad_preparada: 7 },
  ];

  beforeEach(() => {
    jest.resetAllMocks();
    findById.mockResolvedValue(pedido);
    findDetalleById.mockResolvedValue(detalle);
    executeMany.mockResolvedValue([]);
    cambiarEstado.mockResolvedValue(true);
  });

  it('registra cantidades preparadas con el id de stock y luego entrega el detalle actualizado', async () => {
    const actualizado = {
      ...detalle,
      pedido: { ...pedido, estado: EstadoPedido.PENDIENTE_ENTREGA },
    };
    findDetalleById
      .mockResolvedValueOnce(detalle)
      .mockResolvedValueOnce(actualizado);
    await expect(useCase.execute(7, items)).resolves.toBe(actualizado);
    expect(executeMany).toHaveBeenCalledTimes(1);
    expect(executeMany).toHaveBeenCalledWith([
      {
        producto_terminado_id: 501,
        cantidad: 7,
        razon: `Salida por preparación de pedido ${pedido.codigo}`,
      },
      {
        producto_terminado_id: 502,
        cantidad: 9,
        razon: `Salida por preparación de pedido ${pedido.codigo}`,
      },
    ]);
    expect(cambiarEstado).toHaveBeenCalledWith(
      7,
      EstadoPedido.EN_PREPARACION,
      EstadoPedido.PENDIENTE_ENTREGA,
    );
    expect(cambiarEstado.mock.invocationCallOrder[0]).toBeGreaterThan(
      executeMany.mock.invocationCallOrder[0],
    );
    expect(findDetalleById).toHaveBeenCalledTimes(2);
  });

  it.each([
    { caso: 'faltante', recibidos: [items[0]] },
    {
      caso: 'sobrante',
      recibidos: [
        ...items,
        { producto_presentacion_id: 999, cantidad_preparada: 1 },
      ],
    },
    {
      caso: 'sustituido',
      recibidos: [
        items[0],
        { producto_presentacion_id: 999, cantidad_preparada: 1 },
      ],
    },
    { caso: 'duplicado', recibidos: [...items, items[0]] },
    { caso: 'vacío', recibidos: [] },
  ])(
    'rechaza un item $caso sin descontar stock ni cambiar el estado',
    async ({ recibidos }) => {
      await expect(useCase.execute(7, recibidos)).rejects.toBeInstanceOf(
        InvalidRequestError,
      );
      expect(executeMany).not.toHaveBeenCalled();
      expect(cambiarEstado).not.toHaveBeenCalled();
    },
  );

  it('propaga el 409 de stock insuficiente sin cambiar el estado', async () => {
    const error = new StockConflictError('Stock insuficiente');
    executeMany.mockRejectedValue(error);
    await expect(useCase.execute(7, items)).rejects.toBe(error);
    expect(cambiarEstado).not.toHaveBeenCalled();
    expect(findDetalleById).toHaveBeenCalledTimes(1);
  });

  it.each(
    Object.values(EstadoPedido).filter(
      (estado) => estado !== EstadoPedido.EN_PREPARACION,
    ),
  )(
    'rechaza el estado %s sin consultar detalle ni descontar stock',
    async (estado) => {
      findById.mockResolvedValue({ ...pedido, estado });
      await expect(useCase.execute(7, items)).rejects.toBeInstanceOf(
        ResourceConflictError,
      );
      expect(findDetalleById).not.toHaveBeenCalled();
      expect(executeMany).not.toHaveBeenCalled();
      expect(cambiarEstado).not.toHaveBeenCalled();
    },
  );

  it('devuelve 404 si no existe el pedido', async () => {
    findById.mockResolvedValue(null);
    await expect(useCase.execute(99, items)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(executeMany).not.toHaveBeenCalled();
    expect(cambiarEstado).not.toHaveBeenCalled();
  });

  it('devuelve 404 si no encuentra el detalle inicial', async () => {
    findDetalleById.mockResolvedValue(null);
    await expect(useCase.execute(7, items)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(executeMany).not.toHaveBeenCalled();
    expect(cambiarEstado).not.toHaveBeenCalled();
  });

  it('rechaza presentaciones sin producto terminado asociado', async () => {
    findDetalleById.mockResolvedValue({
      ...detalle,
      detalles: detalle.detalles.map((d) => ({
        ...d,
        producto_terminado_id: null,
      })),
    });
    await expect(useCase.execute(7, items)).rejects.toBeInstanceOf(
      InvalidRequestError,
    );
    expect(executeMany).not.toHaveBeenCalled();
    expect(cambiarEstado).not.toHaveBeenCalled();
  });

  it('devuelve 409 si cambia el estado mientras registra la salida', async () => {
    cambiarEstado.mockResolvedValue(false);
    await expect(useCase.execute(7, items)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(findDetalleById).toHaveBeenCalledTimes(1);
  });

  it('devuelve 404 si desaparece el detalle después de actualizar', async () => {
    findDetalleById.mockResolvedValueOnce(detalle).mockResolvedValueOnce(null);
    await expect(useCase.execute(7, items)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(cambiarEstado).toHaveBeenCalledTimes(1);
  });
});
