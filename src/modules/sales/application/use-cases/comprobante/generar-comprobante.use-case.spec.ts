import { Logger } from '@nestjs/common';
import {
  DetallePedidoEntity,
  PagoEntity,
  PedidoEntity,
} from '../../../domain/entities';
import {
  EstadoPedido,
  MetodoPago,
  OrigenPedido,
  TipoComprobante,
  TipoEntrega,
} from '../../../domain/enums';
import {
  CorrelativoNoDisponibleError,
  InvalidRequestError,
  ResourceConflictError,
} from '../../../domain/errors/sales-domain.errors';
import { ComprobanteEmitido } from '../../../domain/repositories/types/comprobante-repository.types';
import { PedidoDetalle } from '../../../domain/repositories/types/pedido-repository.types';
import { ReservarCorrelativoUseCase } from '../series-comprobante/reservar-correlativo.use-case';
import {
  GenerarComprobanteParams,
  GenerarComprobanteUseCase,
} from './generar-comprobante.use-case';

describe('GenerarComprobanteUseCase (HU-B-010)', () => {
  const findByPagoId = jest.fn();
  const create = jest.fn();
  const findEmisor = jest.fn();
  const reservar = jest.fn();
  const enviar = jest.fn();

  const useCase = new GenerarComprobanteUseCase(
    { findByPagoId, create, findEmisor },
    { execute: reservar } as unknown as ReservarCorrelativoUseCase,
    { enviar },
  );

  const FECHA = new Date('2026-11-10T15:00:00Z');
  const EMISOR = {
    razon_social: "Franco's S.A.C.",
    ruc: '20100047218',
    direccion: 'Av. Industrial 123, Lima',
  };

  const pedido = (overrides: Partial<PedidoDetalle> = {}): PedidoDetalle => ({
    pedido: new PedidoEntity(
      1,
      'PED-000001',
      'c7b2e2e3-2222-4d2b-8b1f-4c6c3a7a0002',
      'b6a1f1d2-1111-4c1a-9a0e-3b5b2f6f0001',
      OrigenPedido.PORTAL,
      EstadoPedido.CONFIRMADO,
      TipoEntrega.DELIVERY,
      'Av. Los Olivos 123',
      165.6,
      FECHA,
      FECHA,
    ),
    cliente_nombre: 'Ana Torres',
    detalles: [
      {
        detalle: new DetallePedidoEntity(1, 1, 10, 30, 5.5, 4.2, 126, FECHA),
        sku: 'CH-250',
        producto_nombre: 'Chifle salado',
        presentacion: '250 g',
        stock_disponible: 0,
        producto_terminado_id: 4,
      },
    ],
    pago: new PagoEntity(3, 1, MetodoPago.CULQI, 165.6, 'chr_1', FECHA, FECHA),
    ...overrides,
  });

  const boleta = {
    tipo_comprobante: TipoComprobante.BOLETA,
    ruc: null,
    razon_social: null,
  };
  const factura = {
    tipo_comprobante: TipoComprobante.FACTURA,
    ruc: '20601234565',
    razon_social: 'Distribuidora Andina S.A.C.',
  };

  const params = (
    overrides: Partial<GenerarComprobanteParams> = {},
  ): GenerarComprobanteParams => ({
    pedido: pedido(),
    datos: boleta,
    subtotal: 165.6,
    email: 'ana@francos.test',
    ...overrides,
  });

  const emitido = (
    overrides: Partial<ComprobanteEmitido> = {},
  ): ComprobanteEmitido => ({
    id: 7,
    pago_id: 3,
    tipo: TipoComprobante.BOLETA,
    serie: 'B001',
    numero: 15,
    ruc: null,
    razon_social: null,
    subtotal: 165.6,
    total: 165.6,
    created_at: FECHA,
    ...overrides,
  });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    findByPagoId.mockResolvedValue(null);
    findEmisor.mockResolvedValue(EMISOR);
    reservar.mockResolvedValue({ serie_id: 2, serie: 'B001', numero: 15 });
    create.mockResolvedValue(emitido());
    enviar.mockResolvedValue(undefined);
  });

  it('emite una boleta con el siguiente número de la serie de boletas y los montos del pedido (RF-B30)', async () => {
    const resultado = await useCase.execute(params());

    expect(reservar).toHaveBeenCalledWith(TipoComprobante.BOLETA);
    expect(create).toHaveBeenCalledWith({
      pago_id: 3,
      serie_comprobante_id: 2,
      numero: 15,
      ruc: null,
      razon_social: null,
      subtotal: 165.6,
      total: 165.6,
    });
    expect(resultado).toEqual(emitido());
  });

  it('emite una factura con el RUC y la razón social que el cliente escribió al pagar', async () => {
    reservar.mockResolvedValue({ serie_id: 5, serie: 'F001', numero: 1 });

    await useCase.execute(params({ datos: factura }));

    expect(reservar).toHaveBeenCalledWith(TipoComprobante.FACTURA);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        serie_comprobante_id: 5,
        numero: 1,
        ruc: '20601234565',
        razon_social: 'Distribuidora Andina S.A.C.',
      }),
    );
  });

  it('envía el comprobante al correo del cliente con el emisor y el detalle (RF-B31)', async () => {
    await useCase.execute(params());

    expect(enviar).toHaveBeenCalledWith({
      to: 'ana@francos.test',
      cliente_nombre: 'Ana Torres',
      pedido_codigo: 'PED-000001',
      comprobante: emitido(),
      emisor: EMISOR,
      lineas: [
        {
          producto: 'Chifle salado',
          presentacion: '250 g',
          cantidad: 30,
          precio_aplicado: 4.2,
          subtotal: 126,
        },
      ],
    });
  });

  it('si el correo falla, el comprobante queda emitido igual', async () => {
    enviar.mockRejectedValue(new Error('SMTP caído'));

    await expect(useCase.execute(params())).resolves.toEqual(emitido());
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('no emite otro comprobante si el pago ya tiene uno, ni gasta otro número', async () => {
    findByPagoId.mockResolvedValue(emitido());

    await expect(useCase.execute(params())).resolves.toEqual(emitido());

    expect(reservar).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(enviar).not.toHaveBeenCalled();
  });

  it('sin empresa emisora no reserva número ni emite', async () => {
    findEmisor.mockResolvedValue(null);

    await expect(useCase.execute(params())).rejects.toThrow(
      ResourceConflictError,
    );
    expect(reservar).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('sin serie activa del tipo elegido no emite', async () => {
    reservar.mockRejectedValue(
      new CorrelativoNoDisponibleError(
        'sin_serie_activa',
        'No hay ninguna serie de tipo factura configurada',
      ),
    );

    await expect(useCase.execute(params({ datos: factura }))).rejects.toThrow(
      CorrelativoNoDisponibleError,
    );
    expect(create).not.toHaveBeenCalled();
    expect(enviar).not.toHaveBeenCalled();
  });

  it('rechaza un pedido sin pago', async () => {
    await expect(
      useCase.execute(params({ pedido: pedido({ pago: null }) })),
    ).rejects.toThrow(InvalidRequestError);
    expect(reservar).not.toHaveBeenCalled();
  });
});
