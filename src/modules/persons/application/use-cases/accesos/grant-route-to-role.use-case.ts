import { Injectable } from '@nestjs/common';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { AccesoEntity } from '../../../domain/entities/acceso.entity';
import { AccesoRepository } from '../../../domain/repositories/acceso.repository';
import { RolRepository } from '../../../domain/repositories/rol.repository';
import { RutaRepository } from '../../../domain/repositories/ruta.repository';

@Injectable()
export class GrantRouteToRoleUseCase {
  constructor(
    private readonly accesoRepository: AccesoRepository,
    private readonly rolRepository: RolRepository,
    private readonly rutaRepository: RutaRepository,
  ) {}

  async execute(rolId: number, rutaId: number): Promise<AccesoEntity> {
    const [rol, ruta] = await Promise.all([
      this.rolRepository.findById(rolId),
      this.rutaRepository.findById(rutaId),
    ]);

    if (!rol) {
      throw new ResourceNotFoundError('Rol no encontrado');
    }

    if (!ruta) {
      throw new ResourceNotFoundError('Ruta no encontrada');
    }

    if (!rol.estado || !ruta.estado) {
      throw new ResourceConflictError(
        'Solo se puede conceder acceso a roles y rutas activos',
      );
    }

    const acceso = await this.accesoRepository.findByRoleAndRoute(
      rolId,
      rutaId,
    );

    if (acceso) {
      return acceso.estado
        ? acceso
        : this.accesoRepository.setStatus(acceso.id, true);
    }

    return this.accesoRepository.create({
      rol_id: rolId,
      ruta_id: rutaId,
      estado: true,
    });
  }
}
