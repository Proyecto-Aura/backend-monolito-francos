import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { NotificacionRepository } from '../../domain/repositories/notificacion.repository';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';
import {
  ListNotificacionesParams,
  NotificacionDeUsuario,
} from '../../domain/repositories/types/notificacion-repository.types';
import { NotificacionMapper } from '../mappers/notificacion.mapper';

@Injectable()
export class PrismaNotificacionRepository implements NotificacionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyDeUsuario(
    userId: string,
    params: ListNotificacionesParams,
  ): Promise<PaginatedResult<NotificacionDeUsuario>> {
    const where: Prisma.NotificacionUserWhereInput = {
      user_id: userId,
      ...(params.leido !== undefined ? { leido: params.leido } : {}),
    };
    const [filas, total] = await this.prisma.$transaction([
      this.prisma.notificacionUser.findMany({
        where,
        include: { notificacion: true },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { notificacion: { created_at: 'desc' } },
      }),
      this.prisma.notificacionUser.count({ where }),
    ]);

    return {
      data: filas.map((fila) =>
        NotificacionMapper.toNotificacionDeUsuario(fila),
      ),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async marcarLeida(notificacionId: number, userId: string): Promise<boolean> {
    const { count } = await this.prisma.notificacionUser.updateMany({
      where: { notificacion_id: notificacionId, user_id: userId, leido: false },
      data: { leido: true, fecha_leido: new Date() },
    });
    return count > 0;
  }
}
