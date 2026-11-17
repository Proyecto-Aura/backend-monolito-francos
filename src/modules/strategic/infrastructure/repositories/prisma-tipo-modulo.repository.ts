import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { TipoModuloEntity } from '../../domain/entities';
import { TipoModuloRepository } from '../../domain/repositories/tipo-modulo.repository';
import { TipoModuloMapper } from '../mappers/tipo-modulo.mapper';

@Injectable()
export class PrismaTipoModuloRepository implements TipoModuloRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<TipoModuloEntity | null> {
    const tipoModulo = await this.prisma.tipoModulo.findUnique({
      where: { id },
    });

    return tipoModulo ? TipoModuloMapper.toDomain(tipoModulo) : null;
  }

  async findByCodigo(codigo: string): Promise<TipoModuloEntity | null> {
    const tipoModulo = await this.prisma.tipoModulo.findUnique({
      where: { codigo },
    });

    return tipoModulo ? TipoModuloMapper.toDomain(tipoModulo) : null;
  }
}
