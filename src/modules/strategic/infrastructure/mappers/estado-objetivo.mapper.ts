import { EstadoObjetivo as PrismaEstadoObjetivo } from '@prisma/client';
import { EstadoObjetivoEntity } from '../../domain/entities';

export class EstadoObjetivoMapper {
  static toDomain(estadoObjetivo: PrismaEstadoObjetivo): EstadoObjetivoEntity {
    return new EstadoObjetivoEntity(
      estadoObjetivo.id,
      estadoObjetivo.codigo,
      estadoObjetivo.nombre,
      estadoObjetivo.orden,
      estadoObjetivo.estado,
    );
  }
}
