import { Injectable } from '@nestjs/common';
import { MetodoPago, OrigenPedido, TipoEntrega } from '../../../domain/enums';
import {
  PagoRechazadoError,
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../../domain/repositories/pedido.repository';
import {
  ClienteParaPedido,
  CreateDetallePedidoParams,
  CreatePagoParams,
  PedidoDetalle,
} from '../../../domain/repositories/types/pedido-repository.types';
import { PasarelaPagoService } from '../../../domain/services/pasarela-pago.service';
import { CreatePedidoDto } from '../../dto/pedido-dtos/create-pedido.dto';
import { calcularLinea, calcularTotal } from '../../utils/pedido.utils';

const DESCRIPCION_COBRO = "Pedido Franco's";

@Injectable()
export class CreatePedidoUseCase {
  constructor(
    private readonly pedidoRepository: PedidoRepository,
    private readonly pasarelaPago: PasarelaPagoService,
  ) {}

  // RF-A032: registro manual. El pedido nace confirmado, así que primero se cobra
  // (RF-A035) y solo si el pago se confirma se guarda (RN5).
  async execute(dto: CreatePedidoDto, userId: string): Promise<PedidoDetalle> {
    const cliente = await this.pedidoRepository.findClienteParaPedido(
      dto.cliente_id,
    );

    if (!cliente) {
      throw new ResourceNotFoundError('Cliente no encontrado');
    }

    if (!cliente.estado) {
      throw new ResourceConflictError(
        'El cliente está inactivo y no puede registrar pedidos',
      );
    }

    const detalles = await this.armarDetalles(dto);
    const total = calcularTotal(detalles.map((detalle) => detalle.subtotal));
    const pago = await this.cobrar(dto, cliente, total);

    return this.pedidoRepository.create({
      cliente_id: cliente.id,
      user_id: userId,
      origen: OrigenPedido.MANUAL,
      tipo_entrega: dto.tipo_entrega,
      direccion_entrega:
        dto.tipo_entrega === TipoEntrega.DELIVERY
          ? (dto.direccion_entrega ?? null)
          : null,
      total,
      detalles,
      pago,
    });
  }

  private async armarDetalles(
    dto: CreatePedidoDto,
  ): Promise<CreateDetallePedidoParams[]> {
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

      if (!presentacion.estado || !presentacion.producto_estado) {
        throw new ResourceConflictError(
          `La presentación ${item.producto_presentacion_id} está desactivada`,
        );
      }

      return {
        producto_presentacion_id: presentacion.id,
        cantidad: item.cantidad,
        ...calcularLinea(presentacion, item.cantidad),
      };
    });
  }

  private async cobrar(
    dto: CreatePedidoDto,
    cliente: ClienteParaPedido,
    total: number,
  ): Promise<CreatePagoParams> {
    if (dto.metodo_pago === MetodoPago.EFECTIVO) {
      // El trabajador registra el pedido cuando ya recibió el efectivo.
      return {
        metodo_pago: MetodoPago.EFECTIVO,
        monto: total,
        numero_operacion: null,
        fecha_pago: new Date(),
      };
    }

    if (!cliente.email) {
      throw new ResourceConflictError(
        'El cliente no tiene un correo registrado y Culqi lo necesita para cobrar',
      );
    }

    const resultado = await this.pasarelaPago.cobrar({
      token: dto.culqi_token ?? '',
      monto: total,
      email: cliente.email,
      descripcion: DESCRIPCION_COBRO,
    });

    if (!resultado.aprobado) {
      throw new PagoRechazadoError(resultado.mensaje);
    }

    return {
      metodo_pago: MetodoPago.CULQI,
      monto: total,
      numero_operacion: resultado.numero_operacion,
      fecha_pago: resultado.fecha,
    };
  }
}
