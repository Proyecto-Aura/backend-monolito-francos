import { Injectable } from '@nestjs/common';
import { ClienteEntity } from '../../../domain/entities/cliente.entity';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository';

@Injectable()
export class ChangeClienteStatusUseCase {
  constructor(private readonly clienteRepository: ClienteRepository) {}
  async execute(id: string, estado: boolean): Promise<ClienteEntity> {
    const value = await this.clienteRepository.findById(id);
    if (!value) throw new ResourceNotFoundError('Cliente no encontrado');
    return this.clienteRepository.setStatus(id, estado);
  }
}
