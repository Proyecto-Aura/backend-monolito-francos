import { Injectable } from '@nestjs/common';
import { RutaEntity } from '../../../domain/entities/ruta.entity';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { RutaRepository } from '../../../domain/repositories/ruta.repository';

@Injectable()
export class GetRutaByIdUseCase {
  constructor(private readonly rutaRepository: RutaRepository) {}

  async execute(id: number): Promise<RutaEntity> {
    const ruta = await this.rutaRepository.findById(id);

    if (!ruta) {
      throw new ResourceNotFoundError('Ruta no encontrada');
    }

    return ruta;
  }
}
