import { Prisma } from '@prisma/client';
import {
  ClienteConPersona,
  UbicacionCliente,
} from '../../domain/repositories/types/cliente-repository.types';
import { ClienteMapper } from './cliente.mapper';
import { PersonaMapper } from './persona.mapper';

// El correo vive en User (cuenta de acceso), no en Persona: solo se trae ese campo.
// La ubicación se arma desde el distrito: su provincia y departamento salen de la cadena.
export const CLIENTE_CON_PERSONA_INCLUDE = {
  persona: {
    include: {
      user: { select: { email: true } },
      distrito: { include: { provincia: { include: { departamento: true } } } },
    },
  },
} satisfies Prisma.ClienteInclude;

export type PrismaClienteConPersona = Prisma.ClienteGetPayload<{
  include: typeof CLIENTE_CON_PERSONA_INCLUDE;
}>;

const item = ({ id, nombre }: { id: string; nombre: string }) => ({
  id,
  nombre,
});

export class ClienteConPersonaMapper {
  static toDomain(cliente: PrismaClienteConPersona): ClienteConPersona {
    return {
      cliente: ClienteMapper.toDomain(cliente),
      persona: PersonaMapper.toDomain(cliente.persona),
      email: cliente.persona.user?.email ?? null,
      ubicacion: ClienteConPersonaMapper.ubicacion(cliente),
    };
  }

  private static ubicacion(
    cliente: PrismaClienteConPersona,
  ): UbicacionCliente | null {
    const distrito = cliente.persona.distrito;
    if (!distrito) {
      return null;
    }
    return {
      departamento: item(distrito.provincia.departamento),
      provincia: item(distrito.provincia),
      distrito: item(distrito),
    };
  }
}
