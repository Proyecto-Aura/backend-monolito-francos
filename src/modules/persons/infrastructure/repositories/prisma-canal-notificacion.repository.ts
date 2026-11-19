import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CanalNotificacionEntity } from '../../domain/entities/canal-notificacion.entity';
import { CanalNotificacionTipo } from '../../domain/enums/persons.enums';
import { CanalNotificacionRepository } from '../../domain/repositories/canal-notificacion.repository';
import { UpdateCanalNotificacionParams } from '../../domain/repositories/types/canal-notificacion-repository.types';
import { CanalNotificacionMapper } from '../mappers/canal-notificacion.mapper';

@Injectable()
export class PrismaCanalNotificacionRepository implements CanalNotificacionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CanalNotificacionEntity[]> {
    const canales = await this.prisma.canalNotificacion.findMany({
      orderBy: { tipo: 'asc' },
    });
    return canales.map((canal) => CanalNotificacionMapper.toDomain(canal));
  }

  async findByTipo(
    tipo: CanalNotificacionTipo,
  ): Promise<CanalNotificacionEntity | null> {
    const canal = await this.prisma.canalNotificacion.findUnique({
      where: { tipo },
    });
    return canal ? CanalNotificacionMapper.toDomain(canal) : null;
  }

  async update(
    tipo: CanalNotificacionTipo,
    params: UpdateCanalNotificacionParams,
  ): Promise<CanalNotificacionEntity> {
    const canal = await this.prisma.canalNotificacion.update({
      where: { tipo },
      data: params,
    });
    return CanalNotificacionMapper.toDomain(canal);
  }
}
