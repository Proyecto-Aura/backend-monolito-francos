import { Injectable } from '@nestjs/common';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository';
import { ClienteConPersona } from '../../../domain/repositories/types/cliente-repository.types';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';

@Injectable()
export class GetClienteByIdUseCase {
  constructor(private readonly clienteRepository: ClienteRepository) {}
  async execute(id: string): Promise<ClienteConPersona> {
    const value = await this.clienteRepository.findByIdConPersona(id);
    if (!value) throw new ResourceNotFoundError('Cliente no encontrado');
    return value;
  }
}
