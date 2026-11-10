import { Injectable, Logger } from '@nestjs/common';
import { TipoComprobante } from '../../../domain/enums';
import {
  InvalidRequestError,
  ResourceConflictError,
} from '../../../domain/errors/sales-domain.errors';
import { ComprobanteRepository } from '../../../domain/repositories/comprobante.repository';
import { ComprobanteEmitido } from '../../../domain/repositories/types/comprobante-repository.types';
import { PedidoDetalle } from '../../../domain/repositories/types/pedido-repository.types';
import { EnvioComprobanteService } from '../../../domain/services/envio-comprobante.service';
import { ReservarCorrelativoUseCase } from '../series-comprobante/reservar-correlativo.use-case';
import { codigoComprobante } from '../../utils/comprobante.utils';
import { ComprobanteResumen } from '../pedido/resumir-pedido-portal.use-case';

export interface GenerarComprobanteParams {
  pedido: PedidoDetalle;
  // Lo que el cliente eligió al pagar (HU-B-009), ya validado por el resumen.
  datos: ComprobanteResumen;
  subtotal: number;
  // Correo del cliente al que se envía (RF-B31).
  email: string;
}

// HU-B-010. Emite la boleta o factura de un pedido ya pagado (RF-B30) y la envía
// al correo del cliente (RF-B31). Toma el siguiente correlativo de la serie
// activa del tipo elegido y copia los montos del pedido.
@Injectable()
export class GenerarComprobanteUseCase {
  private readonly logger = new Logger(GenerarComprobanteUseCase.name);

  constructor(
    private readonly comprobanteRepository: ComprobanteRepository,
    private readonly reservarCorrelativo: ReservarCorrelativoUseCase,
    private readonly envioComprobante: EnvioComprobanteService,
  ) {}

  async execute(params: GenerarComprobanteParams): Promise<ComprobanteEmitido> {
    const { pedido, datos } = params;
    if (!pedido.pago) {
      throw new InvalidRequestError(
        'El pedido no tiene un pago: no se puede emitir su comprobante',
      );
    }

    // Un pago tiene un solo comprobante: si ya existe no se gasta otro número.
    const existente = await this.comprobanteRepository.findByPagoId(
      pedido.pago.id,
    );
    if (existente) return existente;

    // Antes de reservar el número, para no dejar huecos en la serie.
    const emisor = await this.comprobanteRepository.findEmisor();
    if (!emisor) {
      throw new ResourceConflictError(
        'No hay una empresa emisora configurada para emitir comprobantes',
      );
    }

    const esFactura = datos.tipo_comprobante === TipoComprobante.FACTURA;
    const correlativo = await this.reservarCorrelativo.execute(
      datos.tipo_comprobante,
    );
    const comprobante = await this.comprobanteRepository.create({
      pago_id: pedido.pago.id,
      serie_comprobante_id: correlativo.serie_id,
      numero: correlativo.numero,
      ruc: esFactura ? datos.ruc : null,
      razon_social: esFactura ? datos.razon_social : null,
      subtotal: params.subtotal,
      total: pedido.pedido.total,
    });

    // El comprobante ya quedó emitido: si el correo falla no se deshace, solo
    // se registra para reenviarlo.
    try {
      await this.envioComprobante.enviar({
        to: params.email,
        cliente_nombre: pedido.cliente_nombre,
        pedido_codigo: pedido.pedido.codigo,
        comprobante,
        emisor,
        lineas: pedido.detalles.map(
          ({ detalle, producto_nombre, presentacion }) => ({
            producto: producto_nombre,
            presentacion,
            cantidad: detalle.cantidad,
            precio_aplicado: detalle.precio_aplicado,
            subtotal: detalle.subtotal,
          }),
        ),
      });
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el comprobante ${codigoComprobante(comprobante.serie, comprobante.numero)} del pedido ${pedido.pedido.codigo}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return comprobante;
  }
}
