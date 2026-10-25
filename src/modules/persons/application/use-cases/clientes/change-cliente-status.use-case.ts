import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository';
import { ClienteConPersona } from '../../../domain/repositories/types/cliente-repository.types';

@Injectable()
export class ChangeClienteStatusUseCase {
  constructor(private readonly clienteRepository: ClienteRepository) {}
  async execute(id: string, estado: boolean): Promise<ClienteConPersona> {
    const value = await this.clienteRepository.findById(id);
    if (!value) throw new ResourceNotFoundError('Cliente no encontrado');
    return this.clienteRepository.setStatus(id, estado);
  }
}
