import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { formatCodigoPedido } from '../../application/utils/pedido.utils';
import { PedidoEntity } from '../../domain/entities';
import { EstadoPedido, MetodoPago } from '../../domain/enums';
import { ResourceConflictError } from '../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../domain/repositories/pedido.repository';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  ClienteParaPedido,
  ClienteParaResumen,
  CreatePedidoParams,
  ListPedidosParams,
  PedidoDetalle,
  PedidoResumen,
  PresentacionParaPedido,
} from '../../domain/repositories/types/pedido-repository.types';
import { PedidoMapper } from '../mappers/pedido.mapper';

const clienteConPersona = {
  select: {
    razon_social: true,
    persona: {
      select: { nombres: true, apellido_paterno: true, apellido_materno: true },
    },
  },
} satisfies Prisma.ClienteDefaultArgs;

const pedidoDetalleInclude = {
  cliente: clienteConPersona,
  detalles: {
    include: {
      producto_presentacion: {
        select: {
          sku: true,
          producto: { select: { nombre: true } },
          presentacion: { select: { cantidad: true, unidad_medida: true } },
        },
      },
    },
    orderBy: { id: 'asc' },
  },
  pago: true,
} satisfies Prisma.PedidoInclude;

type PedidoConDetalle = Prisma.PedidoGetPayload<{
  include: typeof pedidoDetalleInclude;
}>;

@Injectable()
export class PrismaPedidoRepository implements PedidoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findClienteParaPedido(
    clienteId: string,
  ): Promise<ClienteParaPedido | null> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      select: {
        id: true,
        estado: true,
        persona: { select: { user: { select: { email: true } } } },
      },
    });

    return cliente
      ? {
          id: cliente.id,
          estado: cliente.estado,
          email: cliente.persona.user?.email ?? null,
        }
      : null;
  }

  async findClienteParaResumenPorUser(
    userId: string,
  ): Promise<ClienteParaResumen | null> {
    const cliente = await this.prisma.cliente.findFirst({
      where: { persona: { user: { id: userId } } },
      select: {
        id: true,
        estado: true,
        persona: { select: { direccion: true } },
      },
    });

    return cliente
      ? {
          id: cliente.id,
          estado: cliente.estado,
          direccion: cliente.persona.direccion,
        }
      : null;
  }

  async findPresentacionesParaPedido(
    ids: number[],
  ): Promise<PresentacionParaPedido[]> {
    const presentaciones = await this.prisma.productoPresentacion.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        estado: true,
        precio_unitario: true,
        precio_mayorista: true,
        umbral_mayorista: true,
        visible_portal_b: true,
        producto: { select: { estado: true } },
      },
    });

    return presentaciones.map((presentacion) => ({
      id: presentacion.id,
      estado: presentacion.estado,
      producto_estado: presentacion.producto.estado,
      precio_unitario: presentacion.precio_unitario.toNumber(),
      precio_mayorista: presentacion.precio_mayorista?.toNumber() ?? null,
      umbral_mayorista: presentacion.umbral_mayorista,
      visible_portal_b: presentacion.visible_portal_b,
    }));
  }

  async create(params: CreatePedidoParams): Promise<PedidoDetalle> {
    return this.prisma.$transaction(async (tx) => {
      // Se reserva el id antes de insertar para armar el código con él.
      const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`
        SELECT nextval(pg_get_serial_sequence('commerce.pedido', 'id')) AS nextval
      `;
      const id = Number(nextval);

      const pedido = await tx.pedido.create({
        data: {
          id,
          codigo: formatCodigoPedido(id),
          cliente_id: params.cliente_id,
          user_id: params.user_id,
          origen: params.origen,
          tipo_entrega: params.tipo_entrega,
          direccion_entrega: params.direccion_entrega,
          total: params.total,
          detalles: { create: params.detalles },
          pago: { create: params.pago },
        },
        include: pedidoDetalleInclude,
      });

      return this.toPedidoDetalle(pedido);
    });
  }

  async findMany(
    params: ListPedidosParams,
  ): Promise<PaginatedResult<PedidoResumen>> {
    const where: Prisma.PedidoWhereInput = {
      ...(params.estado ? { estado: params.estado } : {}),
      ...(params.origen ? { origen: params.origen } : {}),
      ...(params.cliente_id ? { cliente_id: params.cliente_id } : {}),
      ...(params.desde || params.hasta
        ? {
            created_at: {
              ...(params.desde ? { gte: params.desde } : {}),
              ...(params.hasta ? { lt: params.hasta } : {}),
            },
          }
        : {}),
    };

    const [pedidos, total] = await this.prisma.$transaction([
      this.prisma.pedido.findMany({
        where,
        include: {
          cliente: clienteConPersona,
          pago: { select: { metodo_pago: true } },
        },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        // Orden de llegada (RF-A030).
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.pedido.count({ where }),
    ]);

    return {
      data: pedidos.map((pedido) => ({
        pedido: PedidoMapper.toDomain(pedido),
        cliente_nombre: PedidoMapper.nombreCliente(pedido.cliente),
        metodo_pago:
          (pedido.pago?.metodo_pago as MetodoPago | undefined) ?? null,
      })),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async findById(id: number): Promise<PedidoEntity | null> {
    const pedido = await this.prisma.pedido.findUnique({ where: { id } });

    return pedido ? PedidoMapper.toDomain(pedido) : null;
  }

  async findDetalleById(id: number): Promise<PedidoDetalle | null> {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      include: pedidoDetalleInclude,
    });

    return pedido ? this.toPedidoDetalle(pedido) : null;
  }

  async cambiarEstado(
    id: number,
    desde: EstadoPedido,
    hacia: EstadoPedido,
  ): Promise<boolean> {
    // La condición sobre el estado actual evita pisar un cambio simultáneo.
    const { count } = await this.prisma.pedido.updateMany({
      where: { id, estado: desde },
      data: { estado: hacia },
    });

    return count === 1;
  }

  async marcarEntregado(id: number): Promise<PedidoEntity> {
    return this.prisma.$transaction(async (tx) => {
      // El cambio de estado va primero y con condición: si dos peticiones llegan
      // a la vez, solo una descuenta el stock.
      const { count } = await tx.pedido.updateMany({
        where: { id, estado: EstadoPedido.EN_CAMINO },
        data: { estado: EstadoPedido.ENTREGADO },
      });

      if (count === 0) {
        throw new ResourceConflictError(
          'Solo se puede completar un pedido que está en camino',
        );
      }

      const detalles = await tx.detallePedido.findMany({
        where: { pedido_id: id },
        select: { producto_presentacion_id: true, cantidad: true },
      });

      for (const detalle of detalles) {
        const descontado = await tx.productoTerminado.updateMany({
          where: {
            producto_presentacion_id: detalle.producto_presentacion_id,
            stock_actual: { gte: detalle.cantidad },
          },
          data: { stock_actual: { decrement: detalle.cantidad } },
        });

        if (descontado.count === 0) {
          throw new ResourceConflictError(
            `No hay stock suficiente de la presentación ${detalle.producto_presentacion_id} para completar el pedido`,
          );
        }
      }

      const pedido = await tx.pedido.findUniqueOrThrow({ where: { id } });
      return PedidoMapper.toDomain(pedido);
    });
  }

  private toPedidoDetalle(pedido: PedidoConDetalle): PedidoDetalle {
    return {
      pedido: PedidoMapper.toDomain(pedido),
      cliente_nombre: PedidoMapper.nombreCliente(pedido.cliente),
      detalles: pedido.detalles.map((detalle) => ({
        detalle: PedidoMapper.detalleToDomain(detalle),
        sku: detalle.producto_presentacion.sku,
        producto_nombre: detalle.producto_presentacion.producto.nombre,
        presentacion: `${detalle.producto_presentacion.presentacion.cantidad} ${detalle.producto_presentacion.presentacion.unidad_medida}`,
      })),
      pago: pedido.pago ? PedidoMapper.pagoToDomain(pedido.pago) : null,
    };
  }
}
