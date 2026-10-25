import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  UbigeoItem,
  UbigeoRepository,
} from '../../domain/repositories/ubigeo.repository';

const SELECT_ITEM = { id: true, nombre: true } as const;

// El orden alfabético lo resuelve la app y no la base: con la colación de
// Postgres "Áncash" quedaría al final, después de "Ucayali".
const COLLATOR_ES = new Intl.Collator('es');

function ordenarPorNombre(items: UbigeoItem[]): UbigeoItem[] {
  return [...items].sort((a, b) => COLLATOR_ES.compare(a.nombre, b.nombre));
}

@Injectable()
export class PrismaUbigeoRepository implements UbigeoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listDepartamentos(): Promise<UbigeoItem[]> {
    return ordenarPorNombre(
      await this.prisma.departamento.findMany({ select: SELECT_ITEM }),
    );
  }

  async listProvincias(departamentoId: string): Promise<UbigeoItem[]> {
    return ordenarPorNombre(
      await this.prisma.provincia.findMany({
        where: { departamento_id: departamentoId },
        select: SELECT_ITEM,
      }),
    );
  }

  async listDistritos(provinciaId: string): Promise<UbigeoItem[]> {
    return ordenarPorNombre(
      await this.prisma.distrito.findMany({
        where: { provincia_id: provinciaId },
        select: SELECT_ITEM,
      }),
    );
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
