import { Injectable } from '@nestjs/common';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { RutaEntity } from '../../../domain/entities/ruta.entity';
import { RutaRepository } from '../../../domain/repositories/ruta.repository';

@Injectable()
export class ChangeRutaStatusUseCase {
  constructor(private readonly rutaRepository: RutaRepository) {}

  async execute(id: number, estado: boolean): Promise<RutaEntity> {
    const ruta = await this.rutaRepository.findById(id);

    if (!ruta) {
      throw new ResourceNotFoundError('Ruta no encontrada');
    }

    if (!estado && (await this.rutaRepository.hasActiveChildren(id))) {
      throw new ResourceConflictError(
        'No se puede desactivar una ruta con hijos activos',
      );
    }

    if (estado && ruta.parent_id !== null) {
      const parent = await this.rutaRepository.findById(ruta.parent_id);

      if (!parent || !parent.estado) {
        throw new ResourceConflictError(
          'No se puede activar una ruta cuyo padre está inactivo',
        );
      }
    }

    return this.rutaRepository.setStatus(id, estado);
  }
}
