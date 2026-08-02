import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { AccesoEntity } from '../../../domain/entities/acceso.entity';
import { AccesoRepository } from '../../../domain/repositories/acceso.repository';
import { RutaRepository } from '../../../domain/repositories/ruta.repository';

@Injectable()
export class ListRouteAccessesUseCase {
  constructor(
    private readonly accesoRepository: AccesoRepository,
    private readonly rutaRepository: RutaRepository,
  ) {}

  async execute(rutaId: number): Promise<AccesoEntity[]> {
    const ruta = await this.rutaRepository.findById(rutaId);

    if (!ruta) {
      throw new ResourceNotFoundError('Ruta no encontrada');
    }

    return this.accesoRepository.findByRouteId(rutaId);
  }
}
