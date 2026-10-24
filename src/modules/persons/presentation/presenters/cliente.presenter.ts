import { ClienteConPersona } from '../../domain/repositories/types/cliente-repository.types';
import { PaginatedResult } from '../../domain/repositories/types/pagination.types';

// Lista explícita de campos: nunca se exponen contraseña, hash ni tokens.
export class ClientePresenter {
  static toHttp({ cliente, persona, email, ubicacion }: ClienteConPersona) {
    return {
      id: cliente.id,
      codigo: this.codigo(cliente.codigo),
      persona_id: cliente.persona_id,
      tipo_cliente: cliente.tipo_cliente,
      razon_social: cliente.razon_social,
      categoria_cliente: cliente.categoria_cliente,
      estado: cliente.estado,
      created_at: cliente.created_at,
      updated_at: cliente.updated_at,
      nombres: persona.nombres,
      apellido_paterno: persona.apellido_paterno,
      apellido_materno: persona.apellido_materno,
      tipo_documento: persona.tipo_documento,
      numero_documento: persona.numero_documento,
      telefono: persona.telefono,
      fecha_nacimiento: persona.fecha_nacimiento,
      direccion: persona.direccion,
      ubicacion,
      email,
    };
  }

  // CLI-000001: el número correlativo con ceros a la izquierda.
  static codigo(numero: number): string {
    return `CLI-${String(numero).padStart(6, '0')}`;
  }

  static paginatedToHttp(result: PaginatedResult<ClienteConPersona>) {
    return {
      data: result.data.map((item) => this.toHttp(item)),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }
}
