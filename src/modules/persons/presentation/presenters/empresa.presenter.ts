import { EmpresaEntity } from '../../domain/entities/empresa.entity';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';

export class EmpresaPresenter {
  static toHttp(empresa: EmpresaEntity) {
    return {
      id: empresa.id,
      razon_social: empresa.razon_social,
      ruc: empresa.ruc,
      direccion: empresa.direccion,
      telefono: empresa.telefono,
      email: empresa.email,
      logo_url: empresa.logo_url,
      estado: empresa.estado,
      created_at: empresa.created_at,
      updated_at: empresa.updated_at,
    };
  }

  static paginatedToHttp(result: PaginatedResult<EmpresaEntity>) {
    return {
      data: result.data.map((empresa) => this.toHttp(empresa)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
