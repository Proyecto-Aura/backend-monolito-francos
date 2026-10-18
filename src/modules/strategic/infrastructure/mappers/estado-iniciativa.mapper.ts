import { EstadoIniciativa as PrismaEstadoIniciativa } from '@prisma/client';
import { EstadoIniciativaEntity } from '../../domain/entities';

export class EstadoIniciativaMapper {
  static toDomain(
    estadoIniciativa: PrismaEstadoIniciativa,
  ): EstadoIniciativaEntity {
    return new EstadoIniciativaEntity(
      estadoIniciativa.id,
      estadoIniciativa.codigo,
      estadoIniciativa.nombre,
      estadoIniciativa.orden,
      estadoIniciativa.estado,
    );
  }
}
