import { IniciativaEntityEnriquecido } from '../../domain/repositories/types/iniciativa-repository.types';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';

export class IniciativaPresenter {
  static toHttp(iniciativa: IniciativaEntityEnriquecido) {
    return {
      id: iniciativa.id,
      codigo: iniciativa.codigo,
      nombre: iniciativa.nombre,
      descripcion: iniciativa.descripcion,
      presupuesto: iniciativa.presupuesto,
      motivo_cancelacion: iniciativa.motivo_cancelacion,
      responsable: iniciativa.responsable,
      fecha_inicio: iniciativa.fecha_inicio,
      fecha_fin: iniciativa.fecha_fin,
      estado: iniciativa.estado,
      estado_iniciativa: {
        id: iniciativa.estado_iniciativa.id,
        codigo: iniciativa.estado_iniciativa.codigo,
        nombre: iniciativa.estado_iniciativa.nombre,
      },
      objetivo: {
        id: iniciativa.objetivo_estrategico.id,
        nombre: iniciativa.objetivo_estrategico.nombre,
        perspectiva: {
          id: iniciativa.objetivo_estrategico.perspectiva_bsc.id,
          nombre: iniciativa.objetivo_estrategico.perspectiva_bsc.nombre,
        },
      },
    };
  }

  static paginatedToHttp(result: PaginatedResult<IniciativaEntityEnriquecido>) {
    return {
      data: result.data.map((iniciativa) => this.toHttp(iniciativa)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }

  static resumenPorPlanToHttp(iniciativas: IniciativaEntityEnriquecido[]) {
    return iniciativas.map((iniciativa) => {
      const base = this.toHttp(iniciativa);

      return {
        ...base,
        objetivo: {
          ...base.objetivo,
          responsable: iniciativa.objetivo_estrategico.responsable,
        },
      };
    });
  }
}
