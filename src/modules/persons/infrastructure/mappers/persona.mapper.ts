import { Persona as PrismaPersona } from '@prisma/client';
import { PersonaEntity } from '../../domain/entities/persona.entity';
import { TipoDocumento } from '../../domain/enums/persons.enums';

export class PersonaMapper {
  static toDomain(persona: PrismaPersona): PersonaEntity {
    return new PersonaEntity(
      persona.id,
      persona.nombres,
      persona.apellido_paterno,
      persona.apellido_materno,
      persona.tipo_documento as TipoDocumento,
      persona.numero_documento,
      persona.telefono,
      persona.fecha_nacimiento,
      persona.direccion,
      persona.estado,
      persona.created_at,
      persona.updated_at,
    );
  }
}
