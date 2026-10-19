import { Injectable } from '@nestjs/common';
import { ClienteRepository } from '../../../domain/repositories/cliente.repository';
import { ClienteEntity } from '../../../domain/entities/cliente.entity';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';

@Injectable()
export class GetClienteByIdUseCase {
  constructor(private readonly clienteRepository: ClienteRepository) {}
  async execute(id: string): Promise<ClienteEntity> {
    const value = await this.clienteRepository.findById(id);
    if (!value) throw new ResourceNotFoundError('Cliente no encontrado');
    return value;
  }
}
