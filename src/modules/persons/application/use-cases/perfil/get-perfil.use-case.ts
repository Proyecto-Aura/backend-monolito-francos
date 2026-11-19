import { Injectable } from '@nestjs/common';
import {
  ClienteEntity,
  PersonaEntity,
  UserEntity,
} from '../../../domain/entities';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository';
import { PersonaRepository } from '../../../domain/repositories/persona.repository';
import { UbicacionCliente } from '../../../domain/repositories/types/cliente-repository.types';
import { UserRepository } from '../../../domain/repositories/user.repository';

export interface PerfilCliente {
  user: UserEntity;
  persona: PersonaEntity;
  cliente: ClienteEntity | null;
  // HU-B-018: departamento, provincia y distrito de su dirección (null si no la registró).
  ubicacion: UbicacionCliente | null;
}

// HU-B-015: datos del perfil del cliente que inició sesión.
@Injectable()
export class GetPerfilUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly personaRepository: PersonaRepository,
    private readonly clienteRepository: ClienteRepository,
  ) {}

  async execute(userId: string): Promise<PerfilCliente> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ResourceNotFoundError('Usuario no encontrado');
    }
    const persona = await this.personaRepository.findById(user.persona_id);
    if (!persona) {
      throw new ResourceNotFoundError('Persona no encontrada');
    }
    const cliente = await this.clienteRepository.findByPersonaId(persona.id);
    const conPersona = cliente
      ? await this.clienteRepository.findByIdConPersona(cliente.id)
      : null;
    return { user, persona, cliente, ubicacion: conPersona?.ubicacion ?? null };
  }
}
