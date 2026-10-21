import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { EstadoReembolso, MetodoPago } from '../../domain/enums';
import { ReembolsoRepository } from '../../domain/repositories/reembolso.repository';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  CambioEstadoReembolso,
  ListReembolsosParams,
  NotificacionCliente,
  ReembolsoConPedido,
} from '../../domain/repositories/types/reembolso-repository.types';
import { PedidoMapper } from '../mappers/pedido.mapper';
import { ReembolsoMapper } from '../mappers/reembolso.mapper';

const reembolsoConPedidoInclude = {
  pago: {
    select: {
      metodo_pago: true,
      pedido: {
        select: {
          id: true,
          codigo: true,
          cliente: {
            select: {
              razon_social: true,
              persona: {
                select: {
                  nombres: true,
                  apellido_paterno: true,
                  apellido_materno: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ReembolsoInclude;

type ReembolsoConPedidoPrisma = Prisma.ReembolsoGetPayload<{
  include: typeof reembolsoConPedidoInclude;
}>;

const contiene = (q: string) => ({
  contains: q,
  mode: Prisma.QueryMode.insensitive,
});

@Injectable()
export class PrismaReembolsoRepository implements ReembolsoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    params: ListReembolsosParams,
  ): Promise<PaginatedResult<ReembolsoConPedido>> {
    const where: Prisma.ReembolsoWhereInput = {
      ...(params.estado ? { estado: params.estado } : {}),
      ...(params.desde || params.hasta
        ? {
            fecha_solicitud: {
              ...(params.desde ? { gte: params.desde } : {}),
              ...(params.hasta ? { lt: params.hasta } : {}),
            },
          }
        : {}),
      ...(params.q
        ? {
            OR: [
              { codigo: contiene(params.q) },
              { pago: { pedido: { codigo: contiene(params.q) } } },
              {
                pago: {
                  pedido: {
                    cliente: {
                      OR: [
                        { razon_social: contiene(params.q) },
                        { persona: { nombres: contiene(params.q) } },
                        { persona: { apellido_paterno: contiene(params.q) } },
                        { persona: { apellido_materno: contiene(params.q) } },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [reembolsos, total] = await this.prisma.$transaction([
      this.prisma.reembolso.findMany({
        where,
        include: reembolsoConPedidoInclude,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        // Las solicitudes más recientes primero.
        orderBy: [{ fecha_solicitud: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.reembolso.count({ where }),
    ]);

    return {
      data: reembolsos.map((reembolso) => this.toReembolsoConPedido(reembolso)),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async findById(id: number): Promise<ReembolsoConPedido | null> {
    const reembolso = await this.prisma.reembolso.findUnique({
      where: { id },
      include: reembolsoConPedidoInclude,
    });

    return reembolso ? this.toReembolsoConPedido(reembolso) : null;
  }

  async cambiarEstado(
    id: number,
    desde: EstadoReembolso,
    cambio: CambioEstadoReembolso,
    notificacion: NotificacionCliente,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // La condición sobre el estado actual evita pisar un cambio simultáneo.
      const { count } = await tx.reembolso.updateMany({
        where: { id, estado: desde },
        data: cambio,
      });

      if (count === 0) {
        return false;
      }

      // Solo los clientes con cuenta en el portal pueden recibir el aviso.
      const { pago } = await tx.reembolso.findUniqueOrThrow({
        where: { id },
        select: {
          pago: {
            select: {
              pedido: {
                select: {
                  cliente: {
                    select: {
                      persona: { select: { user: { select: { id: true } } } },
                    },
                  },
                },
              },
            },
          },
        },
      });
      const userId = pago.pedido.cliente.persona.user?.id;

      if (userId) {
        await tx.notificacion.create({
          data: {
            ...notificacion,
            referencia_id: String(id),
            referencia_tipo: 'reembolso',
            notificacion_users: { create: { user_id: userId } },
          },
        });
      }

      return true;
    });
  }

  private toReembolsoConPedido(
    reembolso: ReembolsoConPedidoPrisma,
  ): ReembolsoConPedido {
    const { pedido } = reembolso.pago;

    return {
      reembolso: ReembolsoMapper.toDomain(reembolso),
      pedido_id: pedido.id,
      pedido_codigo: pedido.codigo,
      cliente_nombre: PedidoMapper.nombreCliente(pedido.cliente),
      metodo_pago: reembolso.pago.metodo_pago as MetodoPago,
    };
  }
}
