import { Injectable } from '@nestjs/common';
import { Prisma, TipoDocumento } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  calcularDisponibilidad,
  formatCodigoPedido,
} from '../../application/utils/pedido.utils';
import { PedidoEntity } from '../../domain/entities';
import { EstadoPedido, EstadoReembolso, MetodoPago } from '../../domain/enums';
import { ResourceConflictError } from '../../domain/errors/sales-domain.errors';
import { PedidoRepository } from '../../domain/repositories/pedido.repository';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  ClienteParaPedido,
  ClienteParaResumen,
  CreatePedidoParams,
  IndicadoresPedidosDespacho,
  IndicadoresPedidosInventario,
  ListPedidosParams,
  ListPedidosDeClienteParams,
  NotificacionPedidoParams,
  PedidoDetalle,
  PedidoResumen,
  PedidoResumenPortal,
  PresentacionParaPedido,
} from '../../domain/repositories/types/pedido-repository.types';
import {
  ESTADOS_DE_DESPACHO,
  ESTADOS_DE_INVENTARIO,
} from '../../domain/rules/transiciones-pedido';
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
          producto_terminado: { select: { id: true, stock_actual: true } },
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
        razon_social: true,
        persona: {
          select: {
            direccion: true,
            tipo_documento: true,
            numero_documento: true,
            user: { select: { email: true } },
          },
        },
      },
    });

    return cliente
      ? {
          id: cliente.id,
          estado: cliente.estado,
          email: cliente.persona.user?.email ?? null,
          direccion: cliente.persona.direccion,
          ruc:
            cliente.persona.tipo_documento === TipoDocumento.ruc
              ? cliente.persona.numero_documento
              : null,
          razon_social: cliente.razon_social,
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

      if (params.notificacion && params.user_id) {
        await tx.notificacion.create({
          data: {
            tipo: 'pago_confirmado',
            titulo: params.notificacion.titulo,
            mensaje: params.notificacion.mensaje,
            referencia_tipo: 'pedido',
            referencia_id: String(id),
            notificacion_users: { create: { user_id: params.user_id } },
          },
        });
      }

      return this.toPedidoDetalle(pedido);
    });
  }

  async notificarPagoRechazado(
    userId: string,
    notificacion: NotificacionPedidoParams,
  ): Promise<void> {
    await this.prisma.notificacion.create({
      data: {
        tipo: 'pago_rechazado',
        titulo: notificacion.titulo,
        mensaje: notificacion.mensaje,
        notificacion_users: { create: { user_id: userId } },
      },
    });
  }

  async findMany(
    params: ListPedidosParams,
  ): Promise<PaginatedResult<PedidoResumen>> {
    const where: Prisma.PedidoWhereInput = {
      ...(params.estados
        ? { AND: [{ estado: { in: [...params.estados] } }] }
        : {}),
      ...(params.estado ? { estado: params.estado } : {}),
      ...(params.origen ? { origen: params.origen } : {}),
      ...(params.cliente_id ? { cliente_id: params.cliente_id } : {}),
      ...(params.search
        ? {
            OR: [
              { codigo: { contains: params.search, mode: 'insensitive' } },
              {
                cliente: {
                  razon_social: {
                    contains: params.search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                cliente: {
                  persona: {
                    nombres: { contains: params.search, mode: 'insensitive' },
                  },
                },
              },
              {
                cliente: {
                  persona: {
                    apellido_paterno: {
                      contains: params.search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                cliente: {
                  persona: {
                    apellido_materno: {
                      contains: params.search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            ],
          }
        : {}),
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
          detalles: {
            select: {
              cantidad: true,
              // Solo se usa cuando conDisponibilidad=true (vista de
              // inventario), pero el join es barato (FK indexada) así que se
              // pide siempre para no complicar el tipo del select con un
              // condicional en tiempo de ejecución.
              producto_presentacion: {
                select: {
                  producto_terminado: { select: { stock_actual: true } },
                },
              },
            },
          },
        },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        // Orden de llegada (RF-A030), salvo en la vista de inventario
        // (conDisponibilidad=true): ahí primero por estado -- Postgres
        // ordena un enum por el orden en que se declaró el tipo, así que
        // `estado: 'asc'` ya deja en_espera_inventario, luego
        // en_preparacion, luego pendiente_entrega (ver EstadoPedido en
        // schema.prisma) -- y dentro de cada estado, por orden de llegada.
        orderBy: params.conDisponibilidad
          ? [{ estado: 'asc' }, { created_at: 'asc' }, { id: 'asc' }]
          : [{ created_at: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.pedido.count({ where }),
    ]);

    return {
      data: pedidos.map((pedido) => ({
        pedido: PedidoMapper.toDomain(pedido),
        cliente_nombre: PedidoMapper.nombreCliente(pedido.cliente),
        metodo_pago:
          (pedido.pago?.metodo_pago as MetodoPago | undefined) ?? null,
        cantidad_productos: pedido.detalles.length,
        cantidad_unidades: pedido.detalles.reduce(
          (suma, detalle) => suma + detalle.cantidad,
          0,
        ),
        ...(params.conDisponibilidad
          ? {
              disponibilidad: calcularDisponibilidad(
                pedido.detalles.map((detalle) => ({
                  cantidad: detalle.cantidad,
                  stock_disponible:
                    detalle.producto_presentacion.producto_terminado?.stock_actual.toNumber() ??
                    0,
                })),
              ),
            }
          : {}),
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

  async findManyDeCliente(
    clienteId: string,
    params: ListPedidosDeClienteParams,
  ): Promise<PaginatedResult<PedidoResumenPortal>> {
    const where: Prisma.PedidoWhereInput = {
      cliente_id: clienteId,
      ...(params.estado ? { estado: params.estado } : {}),
    };
    const [pedidos, total] = await this.prisma.$transaction([
      this.prisma.pedido.findMany({
        where,
        include: {
          pago: {
            select: {
              metodo_pago: true,
              reembolso: { select: { id: true, estado: true } },
            },
          },
        },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.pedido.count({ where }),
    ]);

    return {
      data: pedidos.map((pedido) => ({
        pedido: PedidoMapper.toDomain(pedido),
        metodo_pago: (pedido.pago?.metodo_pago as MetodoPago) ?? null,
        reembolso: pedido.pago?.reembolso
          ? {
              id: pedido.pago.reembolso.id,
              estado: pedido.pago.reembolso.estado as EstadoReembolso,
            }
          : null,
      })),
      total,
      page: params.page,
      limit: params.limit,
    };
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

  async marcarEnCamino(
    id: number,
    notificacion: NotificacionPedidoParams,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // Misma condición que cambiarEstado: no pisa un cambio simultáneo.
      const { count } = await tx.pedido.updateMany({
        where: { id, estado: EstadoPedido.PENDIENTE_ENTREGA },
        data: { estado: EstadoPedido.EN_CAMINO },
      });

      if (count === 0) {
        return false;
      }

      const { cliente } = await tx.pedido.findUniqueOrThrow({
        where: { id },
        select: {
          cliente: {
            select: { persona: { select: { user: { select: { id: true } } } } },
          },
        },
      });
      const userId = cliente.persona.user?.id;

      // Pedidos manuales: el cliente puede no tener cuenta en el portal.
      if (userId) {
        await tx.notificacion.create({
          data: {
            tipo: 'pedido_en_camino',
            titulo: notificacion.titulo,
            mensaje: notificacion.mensaje,
            referencia_tipo: 'pedido',
            referencia_id: String(id),
            notificacion_users: { create: { user_id: userId } },
          },
        });
      }

      return true;
    });
  }

  // El stock ya se descontó al dejar el pedido "pendiente_entrega" (salida
  // FEFO real por lote, vía RegistrarSalidaProductoTerminadoUseCase) -- acá
  // solo se registra la entrega, sin tocar stock de nuevo.
  async marcarEntregado(id: number): Promise<PedidoEntity> {
    // Condición en el UPDATE: si dos peticiones llegan a la vez, solo una
    // completa el pedido.
    const { count } = await this.prisma.pedido.updateMany({
      where: { id, estado: EstadoPedido.EN_CAMINO },
      data: { estado: EstadoPedido.ENTREGADO, fecha_entrega: new Date() },
    });

    if (count === 0) {
      throw new ResourceConflictError(
        'Solo se puede completar un pedido que está en camino',
      );
    }

    const pedido = await this.prisma.pedido.findUniqueOrThrow({
      where: { id },
    });
    return PedidoMapper.toDomain(pedido);
  }

  async getIndicadoresInventario(): Promise<IndicadoresPedidosInventario> {
    const conteos = await this.prisma.pedido.groupBy({
      by: ['estado'],
      where: { estado: { in: [...ESTADOS_DE_INVENTARIO] } },
      _count: { _all: true },
    });

    const indicadores: IndicadoresPedidosInventario = {
      en_espera_inventario: 0,
      en_preparacion: 0,
      pendiente_entrega: 0,
    };

    for (const { estado, _count } of conteos) {
      indicadores[estado as keyof IndicadoresPedidosInventario] = _count._all;
    }

    return indicadores;
  }

  async getIndicadoresDespacho(): Promise<IndicadoresPedidosDespacho> {
    const conteos = await this.prisma.pedido.groupBy({
      by: ['estado'],
      where: { estado: { in: [...ESTADOS_DE_DESPACHO] } },
      _count: { _all: true },
    });

    const indicadores: IndicadoresPedidosDespacho = {
      pendiente_entrega: 0,
      en_camino: 0,
      entregado: 0,
    };

    for (const { estado, _count } of conteos) {
      indicadores[estado as keyof IndicadoresPedidosDespacho] = _count._all;
    }

    return indicadores;
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
        stock_disponible:
          detalle.producto_presentacion.producto_terminado?.stock_actual.toNumber() ??
          0,
        producto_terminado_id:
          detalle.producto_presentacion.producto_terminado?.id ?? null,
      })),
      pago: pedido.pago ? PedidoMapper.pagoToDomain(pedido.pago) : null,
    };
  }
}
