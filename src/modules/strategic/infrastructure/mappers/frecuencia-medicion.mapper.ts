import { FrecuenciaMedicion } from '@prisma/client';
import { FrecuenciaMedicionEntity } from '../../domain/entities';

export class FrecuenciaMedicionMapper {
  static toDomain(frecuencia: FrecuenciaMedicion): FrecuenciaMedicionEntity {
    return new FrecuenciaMedicionEntity(
      frecuencia.id,
      frecuencia.nombre,
      frecuencia.periodos_por_anio,
      frecuencia.orden,
      frecuencia.estado,
      frecuencia.created_at,
      frecuencia.updated_at,
    );
  }
}
