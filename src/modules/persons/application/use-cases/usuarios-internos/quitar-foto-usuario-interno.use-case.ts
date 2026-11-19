import { Injectable } from '@nestjs/common';
import { PersonaRepository } from '../../../domain/repositories/persona.repository';
import { UsuarioInternoRepository } from '../../../domain/repositories/usuario-interno.repository';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { UsuarioInterno } from '../../../domain/repositories/types/usuario-interno-repository.types';

@Injectable()
export class QuitarFotoUsuarioInternoUseCase {
  constructor(
    private readonly usuarioInternoRepository: UsuarioInternoRepository,
    private readonly personaRepository: PersonaRepository,
  ) {}

  async execute(id: string): Promise<UsuarioInterno> {
    const usuario = await this.usuarioInternoRepository.findById(id);
    if (!usuario) {
      throw new ResourceNotFoundError('Usuario no encontrado');
    }

    // Solo se desvincula: el archivo queda en francos-media porque el backend
    // no tiene permiso de borrado sobre ese bucket.
    await this.personaRepository.update(usuario.persona.id, {
      foto_url: null,
    });

    const actualizado = await this.usuarioInternoRepository.findById(id);
    if (!actualizado) {
      throw new ResourceNotFoundError('Usuario no encontrado');
    }
    return actualizado;
  }
}
