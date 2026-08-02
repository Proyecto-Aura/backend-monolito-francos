import { Injectable } from '@nestjs/common';
import { MoveRutaDto } from '../../dto/ruta-dtos/move-ruta.dto';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/persons-domain.errors';
import { RutaEntity } from '../../../domain/entities/ruta.entity';
import { RutaRepository } from '../../../domain/repositories/ruta.repository';

@Injectable()
export class MoveRutaUseCase {
  constructor(private readonly rutaRepository: RutaRepository) {}

  async execute(id: number, dto: MoveRutaDto): Promise<RutaEntity> {
    const ruta = await this.rutaRepository.findById(id);

    if (!ruta) {
      throw new ResourceNotFoundError('Ruta no encontrada');
    }

    if (dto.parent_id === undefined) {
      throw new ResourceConflictError('Debe indicar la ruta padre o null');
    }

    if (dto.parent_id === id) {
      throw new ResourceConflictError('Una ruta no puede ser su propia padre');
    }

    if (dto.parent_id !== null) {
      let parent = await this.rutaRepository.findById(dto.parent_id);

      if (!parent || !parent.estado) {
        throw new ResourceNotFoundError(
          'La ruta padre no existe o está inactiva',
        );
      }

      while (parent) {
        if (parent.id === id) {
          throw new ResourceConflictError(
            'No se puede mover una ruta dentro de uno de sus descendientes',
          );
        }

        parent =
          parent.parent_id === null
            ? null
            : await this.rutaRepository.findById(parent.parent_id);
      }
    }

    return this.rutaRepository.move(id, { parent_id: dto.parent_id });
  }
}
