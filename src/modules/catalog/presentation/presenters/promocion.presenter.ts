import {
  estaVigente,
  fechaHoy,
  formatFechaDia,
} from '../../application/utils/promocion.utils';
import { PromocionEntity } from '../../domain/entities';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';

export class PromocionPresenter {
  // Las fechas salen como YYYY-MM-DD (día de calendario). `vigente` indica si la
  // promoción aplica hoy: activa y con la fecha de hoy (Lima) dentro del rango.
  static toHttp(promocion: PromocionEntity, hoy: string = fechaHoy()) {
    return {
      id: promocion.id,
      producto_presentacion_id: promocion.producto_presentacion_id,
      nombre: promocion.nombre,
      tipo: promocion.tipo,
      valor: promocion.valor,
      fecha_inicio: formatFechaDia(promocion.fecha_inicio),
      fecha_fin: formatFechaDia(promocion.fecha_fin),
      estado: promocion.estado,
      vigente: estaVigente(promocion, hoy),
      created_at: promocion.created_at,
      updated_at: promocion.updated_at,
    };
  }

  static paginatedToHttp(result: PaginatedResult<PromocionEntity>) {
    const hoy = fechaHoy();

    return {
      data: result.data.map((promocion) => this.toHttp(promocion, hoy)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
