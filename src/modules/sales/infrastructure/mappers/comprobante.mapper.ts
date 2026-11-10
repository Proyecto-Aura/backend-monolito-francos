import { Prisma } from '@prisma/client';
import { TipoComprobante } from '../../domain/enums/sales.enums';
import { ComprobanteEmitido } from '../../domain/repositories/types/comprobante-repository.types';

export const comprobanteConSerie = {
  serie: { select: { tipo: true, serie: true } },
} satisfies Prisma.ComprobanteInclude;

export type ComprobanteConSerie = Prisma.ComprobanteGetPayload<{
  include: typeof comprobanteConSerie;
}>;

export class ComprobanteMapper {
  static toDomain(comprobante: ComprobanteConSerie): ComprobanteEmitido {
    return {
      id: comprobante.id,
      pago_id: comprobante.pago_id,
      tipo: comprobante.serie.tipo as TipoComprobante,
      serie: comprobante.serie.serie,
      numero: comprobante.numero,
      ruc: comprobante.ruc,
      razon_social: comprobante.razon_social,
      subtotal: comprobante.subtotal.toNumber(),
      total: comprobante.total.toNumber(),
      created_at: comprobante.created_at,
    };
  }
}
