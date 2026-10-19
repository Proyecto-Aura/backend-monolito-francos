import { Injectable } from '@nestjs/common';
import { PromocionEntity } from '../../../domain/entities';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { PromocionRepository } from '../../../domain/repositories/promocion.repository';
import { UpdatePromocionParams } from '../../../domain/repositories/types/promocion-repository.types';
import { UpdatePromocionDto } from '../../dto/promocion-dtos/update-promocion.dto';
import {
  nombrePromocionPorDefecto,
  parseFechaDia,
  validarRangoFechas,
} from '../../utils/promocion.utils';

@Injectable()
export class UpdatePromocionUseCase {
  constructor(private readonly promocionRepository: PromocionRepository) {}

  async execute(id: number, dto: UpdatePromocionDto): Promise<PromocionEntity> {
    const promocion = await this.promocionRepository.findById(id);

    if (!promocion) {
      throw new ResourceNotFoundError('Promoción no encontrada');
    }

    const params: UpdatePromocionParams = {};

    if (dto.valor !== undefined) {
      params.valor = dto.valor;
    }

    if (dto.nombre !== undefined) {
      params.nombre = dto.nombre.trim().replace(/\s+/g, ' ');
    } else if (
      dto.valor !== undefined &&
      promocion.nombre === nombrePromocionPorDefecto(promocion.valor)
    ) {
      // El nombre se había generado solo: se mantiene al día con el porcentaje.
      params.nombre = nombrePromocionPorDefecto(dto.valor);
    }

    if (dto.fecha_inicio !== undefined) {
      params.fecha_inicio = parseFechaDia(dto.fecha_inicio);
    }

    if (dto.fecha_fin !== undefined) {
      params.fecha_fin = parseFechaDia(dto.fecha_fin);
    }

    if (params.fecha_inicio || params.fecha_fin) {
      const fecha_inicio = params.fecha_inicio ?? promocion.fecha_inicio;
      const fecha_fin = params.fecha_fin ?? promocion.fecha_fin;

      validarRangoFechas(fecha_inicio, fecha_fin);

      if (promocion.estado) {
        const seCruza = await this.promocionRepository.existsOverlap({
          producto_presentacion_id: promocion.producto_presentacion_id,
          fecha_inicio,
          fecha_fin,
          excludeId: promocion.id,
        });

        if (seCruza) {
          throw new ResourceConflictError(
            'Ya existe otra promoción activa para esta presentación que se cruza con esas fechas',
          );
        }
      }
    }

    return this.promocionRepository.update(id, params);
  }
}
