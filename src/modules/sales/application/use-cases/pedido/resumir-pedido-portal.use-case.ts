import { Injectable } from '@nestjs/common';
import { TipoEntrega } from '../../../domain/enums';
import {
  InvalidRequestError,
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import { ResumenPedidoPortalDto } from '../../dto/pedido-dtos/resumen-pedido-portal.dto';
import { calcularLinea, calcularTotal } from '../../utils/pedido.utils';

export interface LineaResumenPedido {
  producto_presentacion_id: number;
  cantidad: number;
  precio_unitario: number;
  precio_aplicado: number;
  es_mayorista: boolean;
  subtotal: number;
}

export interface ResumenPedidoPortal {
  tipo_entrega: TipoEntrega;
  direccion_perfil: string | null;
  direccion_entrega: string | null;
  items: LineaResumenPedido[];
  subtotal: number;
  total: number;
}

@Injectable()
export class ResumirPedidoPortalUseCase {
  constructor(private readonly pedidoRepository: PedidoRepository) {}

  // HU-B-007 (RF-B20 a RF-B23): recalcula el carrito del cliente con los precios
  // vigentes y el mayorista (RN17). Solo calcula: no guarda nada ni cobra; el
  // pedido nace con el pago en línea (HU-B-008, RN5).
  async execute(
    dto: ResumenPedidoPortalDto,
    userId: string,
  ): Promise<ResumenPedidoPortal> {
    const cliente =
      await this.pedidoRepository.findClienteParaResumenPorUser(userId);

    if (!cliente) {
      throw new ResourceNotFoundError(
        'No hay un cliente registrado para este usuario',
      );
    }

    if (!cliente.estado) {
      throw new ResourceConflictError(
        'El cliente está inactivo y no puede registrar pedidos',
      );
    }

    const direccionEntrega = this.direccionEntrega(dto, cliente.direccion);
    const items = await this.armarLineas(dto);
    const total = calcularTotal(items.map((item) => item.subtotal));

    return {
      tipo_entrega: dto.tipo_entrega,
      direccion_perfil: cliente.direccion,
      direccion_entrega: direccionEntrega,
      items,
      // Sin costo de delivery, el subtotal y el total coinciden.
      subtotal: total,
      total,
    };
  }

  // RF-B20/RF-B21: en delivery manda la dirección del body (solo para este
  // pedido); si no viene, la del perfil. En recojo en tienda no hay dirección.
  private direccionEntrega(
    dto: ResumenPedidoPortalDto,
    direccionPerfil: string | null,
  ): string | null {
    if (dto.tipo_entrega !== TipoEntrega.DELIVERY) {
      return null;
    }

    const direccion = dto.direccion_entrega ?? direccionPerfil?.trim();

    if (!direccion) {
      throw new InvalidRequestError(
        'Indica una dirección de entrega: tu perfil no tiene una registrada',
      );
    }

    return direccion;
  }

  private async armarLineas(
    dto: ResumenPedidoPortalDto,
  ): Promise<LineaResumenPedido[]> {
    const presentaciones =
      await this.pedidoRepository.findPresentacionesParaPedido(
        dto.items.map((item) => item.producto_presentacion_id),
      );
    const presentacionesPorId = new Map(
      presentaciones.map((presentacion) => [presentacion.id, presentacion]),
    );

    return dto.items.map((item) => {
      const presentacion = presentacionesPorId.get(
        item.producto_presentacion_id,
      );

      if (!presentacion) {
        throw new ResourceNotFoundError(
          `La presentación ${item.producto_presentacion_id} no existe`,
        );
      }

      if (
        !presentacion.estado ||
        !presentacion.producto_estado ||
        !presentacion.visible_portal_b
      ) {
        throw new ResourceConflictError(
          `La presentación ${item.producto_presentacion_id} no está disponible en el catálogo`,
        );
      }

      const linea = calcularLinea(presentacion, item.cantidad);

      return {
        producto_presentacion_id: presentacion.id,
        cantidad: item.cantidad,
        precio_unitario: linea.precio_unitario,
        precio_aplicado: linea.precio_aplicado,
        // RN17: misma condición que precioAplicado (cantidad > umbral).
        es_mayorista:
          presentacion.precio_mayorista !== null &&
          presentacion.umbral_mayorista !== null &&
          item.cantidad > presentacion.umbral_mayorista,
        subtotal: linea.subtotal,
      };
    });
  }
}
