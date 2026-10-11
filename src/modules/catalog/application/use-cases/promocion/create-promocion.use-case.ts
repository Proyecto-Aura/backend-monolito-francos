import { Injectable } from '@nestjs/common';
import { PromocionEntity } from '../../../domain/entities';
import { TipoPromocion } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';
import { PromocionRepository } from '../../../domain/repositories/promocion.repository';
import { CreatePromocionDto } from '../../dto/promocion-dtos/create-promocion.dto';
import {
  nombrePromocionPorDefecto,
  parseFechaDia,
  validarRangoFechas,
} from '../../utils/promocion.utils';

@Injectable()
export class CreatePromocionUseCase {
  constructor(
    private readonly promocionRepository: PromocionRepository,
    private readonly productoPresentacionRepository: ProductoPresentacionRepository,
  ) {}

  async execute(dto: CreatePromocionDto): Promise<PromocionEntity> {
    const productoPresentacion =
      await this.productoPresentacionRepository.findById(
        dto.producto_presentacion_id,
      );

    if (!productoPresentacion) {
      throw new ResourceNotFoundError('Producto presentación no encontrada');
    }

    if (!productoPresentacion.estado) {
      throw new ResourceConflictError(
        'La presentación del producto no está activa',
      );
    }

    const fecha_inicio = parseFechaDia(dto.fecha_inicio);
    const fecha_fin = parseFechaDia(dto.fecha_fin);
    validarRangoFechas(fecha_inicio, fecha_fin);

    const seCruza = await this.promocionRepository.existsOverlap({
      producto_presentacion_id: productoPresentacion.id,
      fecha_inicio,
      fecha_fin,
    });

    if (seCruza) {
      throw new ResourceConflictError(
        'Ya existe una promoción activa para esta presentación que se cruza con esas fechas',
      );
    }

    const nombre = dto.nombre?.trim().replace(/\s+/g, ' ');

    // Por ahora solo hay descuentos por porcentaje; los demás campos de la tabla
    // (nxm, regalo) quedan sin usar.
    return this.promocionRepository.create({
      producto_presentacion_id: productoPresentacion.id,
      nombre: nombre || nombrePromocionPorDefecto(dto.valor),
      tipo: TipoPromocion.PORCENTAJE,
      valor: dto.valor,
      cantidad_paga: null,
      cantidad_lleva: null,
      cantidad_minima: null,
      producto_presentacion_regalo_id: null,
      fecha_inicio,
      fecha_fin,
      estado: true,
    });
  }
}
