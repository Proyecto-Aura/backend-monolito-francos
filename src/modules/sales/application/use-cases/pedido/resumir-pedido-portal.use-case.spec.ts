import { TipoEntrega } from '../../../domain/enums';
import {
  InvalidRequestError,
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import {
  ClienteParaResumen,
  PresentacionParaPedido,
} from '../../../domain/repositories/types/pedido-repository.types';
import { ResumenPedidoPortalDto } from '../../dto/pedido-dtos/resumen-pedido-portal.dto';
import { ResumirPedidoPortalUseCase } from './resumir-pedido-portal.use-case';

describe('ResumirPedidoPortalUseCase', () => {
  const findClienteParaResumenPorUser = jest.fn();
  const findPresentacionesParaPedido = jest.fn();
  const create = jest.fn();

  const pedidoRepository = {
    findClienteParaResumenPorUser,
    findPresentacionesParaPedido,
    create,
  } as unknown as jest.Mocked<PedidoRepository>;

  const useCase = new ResumirPedidoPortalUseCase(pedidoRepository);

  const USER_ID = 'b6a1f1d2-1111-4c1a-9a0e-3b5b2f6f0001';
  const CLIENTE_ID = 'c7b2e2e3-2222-4d2b-8b1f-4c6c3a7a0002';
  const DIRECCION_PERFIL = 'Jr. Huallaga 320, Cercado de Lima';

  const cliente = (
    overrides: Partial<ClienteParaResumen> = {},
  ): ClienteParaResumen => ({
    id: CLIENTE_ID,
    estado: true,
    direccion: DIRECCION_PERFIL,
    ...overrides,
  });

  const presentacion = (
    overrides: Partial<PresentacionParaPedido> = {},
  ): PresentacionParaPedido => ({
    id: 10,
    estado: true,
    producto_estado: true,
    precio_unitario: 5.5,
    precio_mayorista: 4.2,
    umbral_mayorista: 24,
    visible_portal_b: true,
    ...overrides,
  });

  const dto = (
    overrides: Partial<ResumenPedidoPortalDto> = {},
  ): ResumenPedidoPortalDto => ({
    items: [
      { producto_presentacion_id: 10, cantidad: 30 },
      { producto_presentacion_id: 11, cantidad: 4 },
    ],
    tipo_entrega: TipoEntrega.DELIVERY,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    findClienteParaResumenPorUser.mockResolvedValue(cliente());
    findPresentacionesParaPedido.mockResolvedValue([
      presentacion(),
      presentacion({
        id: 11,
        precio_unitario: 9.9,
        precio_mayorista: null,
        umbral_mayorista: null,
      }),
    ]);
  });

  it('calcula líneas y total con el mayorista cuando la cantidad supera el umbral (RN17)', async () => {
    const resumen = await useCase.execute(dto(), USER_ID);

    expect(findClienteParaResumenPorUser).toHaveBeenCalledWith(USER_ID);
    expect(findPresentacionesParaPedido).toHaveBeenCalledWith([10, 11]);
    // 30 x 4.20 + 4 x 9.90 = 126.00 + 39.60 = 165.60
    expect(resumen).toEqual({
      tipo_entrega: TipoEntrega.DELIVERY,
      direccion_perfil: DIRECCION_PERFIL,
      direccion_entrega: DIRECCION_PERFIL,
      items: [
        {
          producto_presentacion_id: 10,
          cantidad: 30,
          precio_unitario: 5.5,
          precio_aplicado: 4.2,
          es_mayorista: true,
          subtotal: 126,
        },
        {
          producto_presentacion_id: 11,
          cantidad: 4,
          precio_unitario: 9.9,
          precio_aplicado: 9.9,
          es_mayorista: false,
          subtotal: 39.6,
        },
      ],
      subtotal: 165.6,
      total: 165.6,
    });
  });

  it('con la cantidad igual al umbral no aplica el mayorista', async () => {
    const resumen = await useCase.execute(
      dto({ items: [{ producto_presentacion_id: 10, cantidad: 24 }] }),
      USER_ID,
    );

    expect(resumen.items[0]).toMatchObject({
      precio_aplicado: 5.5,
      es_mayorista: false,
      subtotal: 132,
    });
    expect(resumen.total).toBe(132);
  });

  it('en delivery usa la dirección del body solo para este pedido', async () => {
    const resumen = await useCase.execute(
      dto({ direccion_entrega: 'Av. La Marina 1450, San Miguel' }),
      USER_ID,
    );

    expect(resumen.direccion_entrega).toBe('Av. La Marina 1450, San Miguel');
    expect(resumen.direccion_perfil).toBe(DIRECCION_PERFIL);
  });

  it('en recojo en tienda no hay dirección de entrega aunque se envíe', async () => {
    const resumen = await useCase.execute(
      dto({
        tipo_entrega: TipoEntrega.RECOJO_TIENDA,
        direccion_entrega: 'Av. La Marina 1450, San Miguel',
      }),
      USER_ID,
    );

    expect(resumen.direccion_entrega).toBeNull();
    expect(resumen.direccion_perfil).toBe(DIRECCION_PERFIL);
  });

  it('en recojo en tienda no exige dirección aunque el perfil no tenga', async () => {
    findClienteParaResumenPorUser.mockResolvedValue(
      cliente({ direccion: null }),
    );

    const resumen = await useCase.execute(
      dto({ tipo_entrega: TipoEntrega.RECOJO_TIENDA }),
      USER_ID,
    );

    expect(resumen.direccion_entrega).toBeNull();
    expect(resumen.direccion_perfil).toBeNull();
  });

  it.each([null, '   '])(
    'en delivery sin dirección en el body ni en el perfil (%p) responde 400',
    async (direccion) => {
      findClienteParaResumenPorUser.mockResolvedValue(cliente({ direccion }));

      await expect(useCase.execute(dto(), USER_ID)).rejects.toBeInstanceOf(
        InvalidRequestError,
      );
    },
  );

  it('si el usuario no tiene cliente responde 404', async () => {
    findClienteParaResumenPorUser.mockResolvedValue(null);

    await expect(useCase.execute(dto(), USER_ID)).rejects.toBeInstanceOf(
      ResourceNotFoundError,
    );
    expect(findPresentacionesParaPedido).not.toHaveBeenCalled();
  });

  it('si el cliente está inactivo responde 409', async () => {
    findClienteParaResumenPorUser.mockResolvedValue(cliente({ estado: false }));

    await expect(useCase.execute(dto(), USER_ID)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(findPresentacionesParaPedido).not.toHaveBeenCalled();
  });

  it('si una presentación no existe responde 404', async () => {
    findPresentacionesParaPedido.mockResolvedValue([presentacion()]);

    await expect(useCase.execute(dto(), USER_ID)).rejects.toThrow(
      new ResourceNotFoundError('La presentación 11 no existe'),
    );
  });

  it.each([
    ['la presentación está inactiva', { estado: false }],
    ['el producto está inactivo', { producto_estado: false }],
    ['no se muestra en el portal', { visible_portal_b: false }],
  ])('si %s responde 409', async (_, overrides) => {
    findPresentacionesParaPedido.mockResolvedValue([
      presentacion(overrides),
      presentacion({ id: 11 }),
    ]);

    await expect(useCase.execute(dto(), USER_ID)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
  });

  it('no registra ningún pedido', async () => {
    await useCase.execute(dto(), USER_ID);

    expect(create).not.toHaveBeenCalled();
  });
});
