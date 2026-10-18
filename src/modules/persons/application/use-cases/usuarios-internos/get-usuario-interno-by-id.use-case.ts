import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { UsuarioInterno } from '../../../domain/repositories/types/usuario-interno-repository.types';
import { UsuarioInternoRepository } from '../../../domain/repositories/usuario-interno.repository';

@Injectable()
export class GetUsuarioInternoByIdUseCase {
  constructor(
    private readonly usuarioInternoRepository: UsuarioInternoRepository,
  ) {}

  async execute(id: string): Promise<UsuarioInterno> {
    const usuario = await this.usuarioInternoRepository.findById(id);
    if (!usuario) {
      throw new ResourceNotFoundError('Usuario interno no encontrado');
    }
    return usuario;
  }
}
