import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { AccesoEntity } from '../../../domain/entities/acceso.entity';
import { AccesoRepository } from '../../../domain/repositories/acceso.repository';
import { RolRepository } from '../../../domain/repositories/rol.repository';

@Injectable()
export class ListRoleAccessesUseCase {
  constructor(
    private readonly accesoRepository: AccesoRepository,
    private readonly rolRepository: RolRepository,
  ) {}

  async execute(rolId: number): Promise<AccesoEntity[]> {
    const rol = await this.rolRepository.findById(rolId);

    if (!rol) {
      throw new ResourceNotFoundError('Rol no encontrado');
    }

    return this.accesoRepository.findByRoleId(rolId);
  }
}
