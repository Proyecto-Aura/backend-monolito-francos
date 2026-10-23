import { Prisma } from '@prisma/client';
import { ClienteConPersona } from '../../domain/repositories/types/cliente-repository.types';
import { ClienteMapper } from './cliente.mapper';
import { PersonaMapper } from './persona.mapper';

// El correo vive en User (cuenta de acceso), no en Persona: solo se trae ese campo.
export const CLIENTE_CON_PERSONA_INCLUDE = {
  persona: { include: { user: { select: { email: true } } } },
} satisfies Prisma.ClienteInclude;

export type PrismaClienteConPersona = Prisma.ClienteGetPayload<{
  include: typeof CLIENTE_CON_PERSONA_INCLUDE;
}>;

export class ClienteConPersonaMapper {
  static toDomain(cliente: PrismaClienteConPersona): ClienteConPersona {
    return {
      cliente: ClienteMapper.toDomain(cliente),
      persona: PersonaMapper.toDomain(cliente.persona),
      email: cliente.persona.user?.email ?? null,
    };
  }
}
