import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PerspectivaBscEntity } from '../../domain/entities';
import { PerspectivaBscRepository } from '../../domain/repositories/perspectiva-bsc.repository';
import { PerspectivaBscMapper } from '../mappers/perspectiva-bsc.mapper';

@Injectable()
export class PrismaPerspectivaBscRepository implements PerspectivaBscRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<PerspectivaBscEntity | null> {
    const perspectiva = await this.prisma.perspectivaBsc.findUnique({
      where: { id },
    });

    return perspectiva ? PerspectivaBscMapper.toDomain(perspectiva) : null;
  }

  async findAll(): Promise<PerspectivaBscEntity[]> {
    const perspectivas = await this.prisma.perspectivaBsc.findMany({
      where: { estado: true },
      orderBy: { orden: 'asc' },
    });

    return perspectivas.map((perspectiva) =>
      PerspectivaBscMapper.toDomain(perspectiva),
    );
  }
}
