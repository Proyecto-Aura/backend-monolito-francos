import { Injectable, Logger } from '@nestjs/common';
import { MetodoPago, OrigenPedido, TipoEntrega } from '../../../domain/enums';
import {
  PagoRechazadoError,
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { PedidoDetalle } from '../../../domain/repositories/types/pedido-repository.types';
import { PasarelaPagoService } from '../../../domain/services/pasarela-pago.service';
import { CrearPedidoPortalDto } from '../../dto/pedido-dtos/crear-pedido-portal.dto';
import { GenerarComprobanteUseCase } from '../comprobante/generar-comprobante.use-case';
import { ResumirPedidoPortalUseCase } from './resumir-pedido-portal.use-case';

const DESCRIPCION_COBRO = "Pedido Franco's";

@Injectable()
export class CrearPedidoPortalUseCase {
  private readonly logger = new Logger(CrearPedidoPortalUseCase.name);

  constructor(
    private readonly pedidoRepository: PedidoRepository,
    private readonly pasarelaPago: PasarelaPagoService,
    private readonly resumirPedidoPortal: ResumirPedidoPortalUseCase,
    private readonly generarComprobante: GenerarComprobanteUseCase,
  ) {}

  // HU-B-008 (RF-B24 a RF-B28). El total se recalcula en el servidor con el mismo
  // resumen que vio el cliente antes de pagar (RF-B25) y nunca viene del body.
  // Primero se cobra y solo si el pago se confirma se guarda el pedido (RN5): un
  // pago rechazado no deja nada guardado, así que reintentar es volver a pagar el
  // mismo carrito con otro token y no crea un pedido duplicado (RF-B27).
  async execute(
    dto: CrearPedidoPortalDto,
    userId: string,
  ): Promise<PedidoDetalle> {
    const resumen = await this.resumirPedidoPortal.execute(dto, userId);
    const cliente =
      await this.pedidoRepository.findClienteParaResumenPorUser(userId);

    if (!cliente) {
      throw new ResourceNotFoundError(
        'No hay un cliente registrado para este usuario',
      );
    }

    if (!cliente.email) {
      throw new ResourceConflictError(
        'Tu cuenta no tiene un correo registrado y la pasarela lo necesita para cobrar',
      );
    }

    const resultado = await this.pasarelaPago.cobrar({
      token: dto.culqi_token,
      monto: resumen.total,
      email: cliente.email,
      descripcion: DESCRIPCION_COBRO,
    });

    if (!resultado.aprobado) {
      await this.pedidoRepository.notificarPagoRechazado(userId, {
        titulo: 'Pago rechazado',
        mensaje: `No pudimos procesar tu pago de ${monto(resumen.total)}: ${resultado.mensaje} Tu pedido no se registró; puedes intentarlo de nuevo.`,
      });
      throw new PagoRechazadoError(resultado.mensaje);
    }

    const pedido = await this.pedidoRepository.create({
      cliente_id: cliente.id,
      user_id: userId,
      origen: OrigenPedido.PORTAL,
      tipo_entrega: resumen.tipo_entrega,
      direccion_entrega:
        resumen.tipo_entrega === TipoEntrega.DELIVERY
          ? resumen.direccion_entrega
          : null,
      total: resumen.total,
      detalles: resumen.items.map((item) => ({
        producto_presentacion_id: item.producto_presentacion_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        precio_aplicado: item.precio_aplicado,
        subtotal: item.subtotal,
      })),
      pago: {
        metodo_pago: MetodoPago.CULQI,
        monto: resumen.total,
        numero_operacion: resultado.numero_operacion,
        fecha_pago: resultado.fecha,
      },
      notificacion: {
        titulo: 'Pago confirmado',
        mensaje: `Recibimos tu pago de ${monto(resumen.total)}. Tu pedido está pagado y confirmado.`,
      },
    });

    // HU-B-010: con el pago confirmado se emite la boleta o factura y se envía
    // al correo. El cobro ya se hizo y el pedido ya existe, así que un fallo
    // aquí (sin serie activa, sin empresa emisora) no lo deshace: el pedido
    // queda sin comprobante y el error se registra.
    try {
      const comprobante = await this.generarComprobante.execute({
        pedido,
        datos: resumen.comprobante,
        subtotal: resumen.subtotal,
        email: cliente.email,
      });
      return { ...pedido, comprobante };
    } catch (error) {
      this.logger.error(
        `No se pudo emitir el comprobante del pedido ${pedido.pedido.codigo}`,
        error instanceof Error ? error.stack : String(error),
      );
      return pedido;
    }
  }
}

function monto(total: number): string {
  return `S/ ${total.toFixed(2)}`;
}
