import { Periodo } from '@prisma/client';
import { PeriodoEntity } from '../../domain/entities';

export class PeriodoMapper {
  static toDomain(periodo: Periodo): PeriodoEntity {
    return new PeriodoEntity(
      periodo.id,
      periodo.frecuencia_id,
      periodo.numero,
      periodo.codigo,
      periodo.nombre,
      periodo.mes_fin,
      periodo.estado,
      periodo.created_at,
      periodo.updated_at,
    );
  }
}
