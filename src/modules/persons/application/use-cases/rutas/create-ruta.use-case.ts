import { Injectable } from '@nestjs/common';
import { CreateRutaDto } from '../../dto/ruta-dtos/create-ruta.dto';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { RutaEntity } from '../../../domain/entities/ruta.entity';
import { RutaRepository } from '../../../domain/repositories/ruta.repository';

@Injectable()
export class CreateRutaUseCase {
  constructor(private readonly rutaRepository: RutaRepository) {}

  async execute(dto: CreateRutaDto): Promise<RutaEntity> {
    const exists = await this.rutaRepository.existsByName(dto.nombre);

    if (exists) {
      throw new ResourceConflictError('Ya existe una ruta con ese nombre');
    }

    if (dto.parent_id !== undefined) {
      const parent = await this.rutaRepository.findById(dto.parent_id);

      if (!parent || !parent.estado) {
        throw new ResourceNotFoundError(
          'La ruta padre no existe o está inactiva',
        );
      }
    }

    return this.rutaRepository.create({
      nombre: dto.nombre,
      etiqueta: dto.etiqueta,
      icono: dto.icono,
      descripcion: dto.descripcion ?? null,
      estado: dto.estado ?? true,
      parent_id: dto.parent_id ?? null,
    });
  }
}
