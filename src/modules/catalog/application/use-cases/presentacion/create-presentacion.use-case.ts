import { Injectable } from '@nestjs/common';
import { PresentacionRepository } from '../../../domain/repositories/presentacion.repository';
import { CreatePresentacionDto } from '../../dto/presentacion-dtos/create-presentacion.dto';
import { ResourceConflictError } from '../../../domain/errors/catalog-domain.errors';
import { PresentacionEntity } from '../../../domain/entities';

@Injectable()
export class CreatePresentacionUseCase {
  constructor(
    private readonly presentacionRepository: PresentacionRepository,
  ) {}

  async execute(dto: CreatePresentacionDto): Promise<PresentacionEntity> {
    const exists =
      await this.presentacionRepository.existsByCantidadAndUnidadMedida(
        dto.cantidad,
        dto.unidad_medida,
      );
    if (exists) {
      throw new ResourceConflictError(
        'Ya existe una presentacion con esta cantidad y unidad de medida',
      );
    }
    return this.presentacionRepository.create({
      cantidad: dto.cantidad,
      unidad_medida: dto.unidad_medida,
      descripcion: dto.descripcion ?? null,
      estado: dto.estado ?? true,
    });
  }
}
