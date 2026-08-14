import { Injectable } from '@nestjs/common';
import { UpdateRutaDto } from '../../dto/ruta-dtos/update-ruta.dto';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { RutaEntity } from '../../../domain/entities/ruta.entity';
import { RutaRepository } from '../../../domain/repositories/ruta.repository';

@Injectable()
export class UpdateRutaUseCase {
  constructor(private readonly rutaRepository: RutaRepository) {}

  async execute(id: number, dto: UpdateRutaDto): Promise<RutaEntity> {
    const ruta = await this.rutaRepository.findById(id);

    if (!ruta) {
      throw new ResourceNotFoundError('Ruta no encontrada');
    }

    if (dto.nombre && dto.nombre !== ruta.nombre) {
      const exists = await this.rutaRepository.existsByName(dto.nombre, id);

      if (exists) {
        throw new ResourceConflictError('Ya existe una ruta con ese nombre');
      }
    }

    return this.rutaRepository.update(id, { nombre: dto.nombre });
  }
}
