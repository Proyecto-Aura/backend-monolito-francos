import { ObjetivoEstrategicoEntityEnriquecido } from '../../domain/repositories/types/objetivo-estrategico-repository.types';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';

export class ObjetivoEstrategicoPresenter {
  static toHttp(objetivo: ObjetivoEstrategicoEntityEnriquecido) {
    return {
      id: objetivo.id,
      codigo: objetivo.codigo,
      plan_estrategico_id: objetivo.plan_estrategico_id,
      perspectiva_bsc_id: objetivo.perspectiva_bsc_id,
      responsable: objetivo.responsable,
      nombre: objetivo.nombre,
      descripcion: objetivo.descripcion,
      estado: objetivo.estado,
      created_at: objetivo.created_at,
      updated_at: objetivo.updated_at,
      perspectiva_bsc: {
        id: objetivo.perspectiva_bsc.id,
        nombre: objetivo.perspectiva_bsc.nombre,
        descripcion: objetivo.perspectiva_bsc.descripcion,
        orden: objetivo.perspectiva_bsc.orden,
      },
      estado_objetivo: {
        codigo: objetivo.estado_objetivo.codigo,
        nombre: objetivo.estado_objetivo.nombre,
      },
      relaciones_destino_ids: objetivo.relaciones_como_origen
        .filter((relacion) => relacion.estado)
        .map((relacion) => relacion.destino_id),
    };
  }

  static paginatedGroupedToHttp(
    result: PaginatedResult<ObjetivoEstrategicoEntityEnriquecido>,
  ) {
    const grupos = new Map<
      number,
      {
        perspectiva: {
          id: number;
          nombre: string;
          descripcion: string | null;
          orden: number;
        };
        objetivos: ReturnType<typeof ObjetivoEstrategicoPresenter.toHttp>[];
      }
    >();

    for (const objetivo of result.data) {
      let grupo = grupos.get(objetivo.perspectiva_bsc.id);

      if (!grupo) {
        grupo = {
          perspectiva: {
            id: objetivo.perspectiva_bsc.id,
            nombre: objetivo.perspectiva_bsc.nombre,
            descripcion: objetivo.perspectiva_bsc.descripcion,
            orden: objetivo.perspectiva_bsc.orden,
          },
          objetivos: [],
        };
        grupos.set(objetivo.perspectiva_bsc.id, grupo);
      }

      grupo.objetivos.push(this.toHttp(objetivo));
    }

    return {
      data: Array.from(grupos.values()),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
