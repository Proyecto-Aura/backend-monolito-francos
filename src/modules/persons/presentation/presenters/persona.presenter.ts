import { PersonaEntity } from '../../domain/entities/persona.entity';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';

export class PersonaPresenter {
  static toHttp(persona: PersonaEntity) {
    return {
      id: persona.id,
      nombres: persona.nombres,
      apellido_paterno: persona.apellido_paterno,
      apellido_materno: persona.apellido_materno,
      tipo_documento: persona.tipo_documento,
      numero_documento: persona.numero_documento,
      telefono: persona.telefono,
      fecha_nacimiento: persona.fecha_nacimiento,
      direccion: persona.direccion,
      estado: persona.estado,
      created_at: persona.created_at,
      updated_at: persona.updated_at,
    };
  }

  static paginatedToHttp(result: PaginatedResult<PersonaEntity>) {
    return {
      data: result.data.map((persona) => this.toHttp(persona)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
