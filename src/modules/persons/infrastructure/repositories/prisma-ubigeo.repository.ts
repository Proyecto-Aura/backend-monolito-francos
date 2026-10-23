import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  UbigeoItem,
  UbigeoRepository,
} from '../../domain/repositories/ubigeo.repository';

const SELECT_ITEM = { id: true, nombre: true } as const;
const ORDEN_POR_NOMBRE = { nombre: 'asc' } as const;

@Injectable()
export class PrismaUbigeoRepository implements UbigeoRepository {
  constructor(private readonly prisma: PrismaService) {}

  listDepartamentos(): Promise<UbigeoItem[]> {
    return this.prisma.departamento.findMany({
      select: SELECT_ITEM,
      orderBy: ORDEN_POR_NOMBRE,
    });
  }

  listProvincias(departamentoId: string): Promise<UbigeoItem[]> {
    return this.prisma.provincia.findMany({
      where: { departamento_id: departamentoId },
      select: SELECT_ITEM,
      orderBy: ORDEN_POR_NOMBRE,
    });
  }

  listDistritos(provinciaId: string): Promise<UbigeoItem[]> {
    return this.prisma.distrito.findMany({
      where: { provincia_id: provinciaId },
      select: SELECT_ITEM,
      orderBy: ORDEN_POR_NOMBRE,
    });
  }

  async existsDistrito(id: string): Promise<boolean> {
    return (
      (await this.prisma.distrito.findUnique({
        where: { id },
        select: { id: true },
      })) !== null
    );
  }
}
