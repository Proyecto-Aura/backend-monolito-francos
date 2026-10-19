import { DocumentoEstrategicoEntity } from '../../domain/entities';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';

export class DocumentoEstrategicoPresenter {
  static toHttp(documento: DocumentoEstrategicoEntity, url?: string) {
    return {
      id: documento.id,
      plan_estrategico_id: documento.plan_estrategico_id,
      nombre: documento.nombre,
      nombre_original: documento.nombre_original,
      estado: documento.estado,
      created_at: documento.created_at,
      updated_at: documento.updated_at,
      ...(url ? { url } : {}),
    };
  }

  static paginatedToHttp(
    result: PaginatedResult<DocumentoEstrategicoEntity>,
    urls: Map<number, string>,
  ) {
    return {
      data: result.data.map((documento) =>
        this.toHttp(documento, urls.get(documento.id)),
      ),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
