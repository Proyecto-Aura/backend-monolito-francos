import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { AccesoEntity } from '../../../domain/entities/acceso.entity';
import { AccesoRepository } from '../../../domain/repositories/acceso.repository';

@Injectable()
export class RevokeRouteFromRoleUseCase {
  constructor(private readonly accesoRepository: AccesoRepository) {}

  async execute(rolId: number, rutaId: number): Promise<AccesoEntity> {
    const acceso = await this.accesoRepository.findByRoleAndRoute(
      rolId,
      rutaId,
    );

    if (!acceso) {
      throw new ResourceNotFoundError('El acceso no existe');
    }

    return acceso.estado
      ? this.accesoRepository.setStatus(acceso.id, false)
      : acceso;
  }
}
