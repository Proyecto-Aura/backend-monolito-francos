import { SerieComprobante as PrismaSerieComprobante } from '@prisma/client';
import { SerieComprobanteEntity } from '../../domain/entities/serie-comprobante.entity';
import { TipoComprobante } from '../../domain/enums/sales.enums';

export class SerieComprobanteMapper {
  static toDomain(serie: PrismaSerieComprobante): SerieComprobanteEntity {
    return new SerieComprobanteEntity(
      serie.id,
      serie.tipo as TipoComprobante,
      serie.serie,
      serie.correlativo_inicio,
      serie.correlativo_fin,
      serie.correlativo_actual,
      serie.umbral_alerta,
      serie.estado,
      serie.created_at,
      serie.updated_at,
    );
  }
}
