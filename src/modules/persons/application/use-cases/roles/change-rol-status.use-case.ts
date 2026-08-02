import { Injectable } from '@nestjs/common';
import { RolEntity } from '../../../domain/entities/rol.entity';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { RolRepository } from '../../../domain/repositories/rol.repository';

@Injectable()
export class ChangeRolStatusUseCase {
  constructor(private readonly rolRepository: RolRepository) {}

  async execute(id: number, estado: boolean): Promise<RolEntity> {
    const rol = await this.rolRepository.findById(id);

    if (!rol) {
      throw new ResourceNotFoundError('Rol no encontrado');
    }

    return this.rolRepository.setStatus(id, estado);
  }
}
