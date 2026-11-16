import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { ParametroVentaEntity } from '../../domain/entities/parametro-venta.entity';
import { ParametroVentaRepository } from '../../domain/repositories/parametro-venta.repository';
import { UpdateParametroVentaParams } from '../../domain/repositories/types/parametro-venta-repository.types';
import { ParametroVentaMapper } from '../mappers/parametro-venta.mapper';

// Fila única: el id está fijo en 1 (lo garantiza un CHECK en la base).
const ID_UNICO = 1;

@Injectable()
export class PrismaParametroVentaRepository implements ParametroVentaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<ParametroVentaEntity> {
    const fila = await this.prisma.parametroVenta.upsert({
      where: { id: ID_UNICO },
      create: { id: ID_UNICO },
      update: {},
    });
    return ParametroVentaMapper.toDomain(fila);
  }

  async update(
    params: UpdateParametroVentaParams,
  ): Promise<ParametroVentaEntity> {
    const fila = await this.prisma.parametroVenta.upsert({
      where: { id: ID_UNICO },
      create: { id: ID_UNICO, ...params },
      update: params,
    });
    return ParametroVentaMapper.toDomain(fila);
  }
}
