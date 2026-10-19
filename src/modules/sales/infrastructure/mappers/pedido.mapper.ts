import {
  DetallePedido as PrismaDetallePedido,
  Pago as PrismaPago,
  Pedido as PrismaPedido,
} from '@prisma/client';
import {
  DetallePedidoEntity,
  PagoEntity,
  PedidoEntity,
} from '../../domain/entities';
import {
  EstadoPedido,
  MetodoPago,
  OrigenPedido,
  TipoEntrega,
} from '../../domain/enums';

interface ClienteConPersona {
  razon_social: string | null;
  persona: {
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
  };
}

export class PedidoMapper {
  static toDomain(pedido: PrismaPedido): PedidoEntity {
    return new PedidoEntity(
      pedido.id,
      pedido.codigo,
      pedido.cliente_id,
      pedido.user_id,
      pedido.origen as OrigenPedido,
      pedido.estado as EstadoPedido,
      pedido.tipo_entrega as TipoEntrega,
      pedido.direccion_entrega,
      pedido.total.toNumber(),
      pedido.created_at,
      pedido.updated_at,
    );
  }

  static detalleToDomain(detalle: PrismaDetallePedido): DetallePedidoEntity {
    return new DetallePedidoEntity(
      detalle.id,
      detalle.pedido_id,
      detalle.producto_presentacion_id,
      detalle.cantidad,
      detalle.precio_unitario.toNumber(),
      detalle.precio_aplicado.toNumber(),
      detalle.subtotal.toNumber(),
      detalle.created_at,
    );
  }

  static pagoToDomain(pago: PrismaPago): PagoEntity {
    return new PagoEntity(
      pago.id,
      pago.pedido_id,
      pago.metodo_pago as MetodoPago,
      pago.monto.toNumber(),
      pago.numero_operacion,
      pago.fecha_pago,
      pago.created_at,
    );
  }

  // Empresas por su razón social; personas por su nombre completo.
  static nombreCliente(cliente: ClienteConPersona): string {
    if (cliente.razon_social) {
      return cliente.razon_social;
    }

    const { nombres, apellido_paterno, apellido_materno } = cliente.persona;
    return `${nombres} ${apellido_paterno} ${apellido_materno}`;
  }
}
