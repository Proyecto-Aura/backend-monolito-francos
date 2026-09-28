import { Injectable } from '@nestjs/common';
import { UpdatePresentacionDto } from '../../dto/presentacion-dtos/update-presentacion.dto';
import { PresentacionEntity } from '../../../domain/entities/presentacion.entity';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { PresentacionRepository } from '../../../domain/repositories/presentacion.repository';

@Injectable()
export class UpdatePresentacionUseCase {
  constructor(
    private readonly presentacionRepository: PresentacionRepository,
  ) {}

  async execute(
    id: number,
    dto: UpdatePresentacionDto,
  ): Promise<PresentacionEntity> {
    const presentacion = await this.presentacionRepository.findById(id);

    if (!presentacion) {
      throw new ResourceNotFoundError('Presentación no encontrada');
    }

    const cantidad = dto.cantidad ?? presentacion.cantidad;
    const unidadMedida = dto.unidad_medida ?? presentacion.unidad_medida;
    const changedCombination =
      cantidad !== presentacion.cantidad ||
      unidadMedida !== presentacion.unidad_medida;

    if (
      changedCombination &&
      (await this.presentacionRepository.existsByCantidadAndUnidadMedida(
        cantidad,
        unidadMedida,
        id,
      ))
    ) {
      throw new ResourceConflictError(
        'Ya existe una presentación con esta cantidad y unidad de medida',
      );
    }

    return this.presentacionRepository.update(id, {
      cantidad: dto.cantidad,
      unidad_medida: dto.unidad_medida,
      descripcion: dto.descripcion,
    });
  }
}
