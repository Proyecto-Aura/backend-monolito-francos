import { Injectable } from '@nestjs/common';
import { MovimientoProductoTerminadoEntity } from '../../../domain/entities';
import { TipoMovimientoProductoTerminado } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { LoteProductoTerminadoRepository } from '../../../domain/repositories/lote-producto-terminado.repository';
import { MovimientoProductoTerminadoRepository } from '../../../domain/repositories/movimiento-producto-terminado.repository';
import { CreateMovimientoProductoTerminadoParams } from '../../../domain/repositories/types/movimiento-producto-terminado-repository.types';
import { CreateAjusteMovimientoProductoTerminadoDto } from '../../dto/movimiento-producto-terminado-dtos/create-ajuste-movimiento.dto';

@Injectable()
export class RegistrarAjusteProductoTerminadoUseCase {
  constructor(
    private readonly movimientoProductoTerminadoRepository: MovimientoProductoTerminadoRepository,
    private readonly loteProductoTerminadoRepository: LoteProductoTerminadoRepository,
  ) {}

  async execute(
    dto: CreateAjusteMovimientoProductoTerminadoDto,
  ): Promise<MovimientoProductoTerminadoEntity> {
    if (dto.cantidad === 0) {
      throw new ResourceConflictError('La cantidad del ajuste no puede ser 0');
    }

    const lote = await this.loteProductoTerminadoRepository.findById(
      dto.lote_producto_terminado_id,
    );
    if (!lote) {
      throw new ResourceNotFoundError('Lote no encontrado');
    }
    if (!lote.activo) {
      throw new ResourceConflictError('El lote no está activo');
    }

    const resultante = lote.cantidad_actual + dto.cantidad;
    if (resultante < 0) {
      throw new ResourceConflictError(
        `El ajuste dejaría el lote con stock negativo (actual: ${lote.cantidad_actual}, ajuste: ${dto.cantidad})`,
      );
    }

    return this.movimientoProductoTerminadoRepository.create({
      lote_producto_terminado_id: lote.id,
      tipo: TipoMovimientoProductoTerminado.AJUSTE,
      cantidad: dto.cantidad,
      razon: dto.razon,
    });
  }

  // Varias filas en un mismo envío, todas en una sola transacción vía
  // createMany: o se guardan todas o ninguna.
  async executeMany(
    dtos: CreateAjusteMovimientoProductoTerminadoDto[],
  ): Promise<MovimientoProductoTerminadoEntity[]> {
    const params: CreateMovimientoProductoTerminadoParams[] = [];

    for (const dto of dtos) {
      if (dto.cantidad === 0) {
        throw new ResourceConflictError(
          'La cantidad del ajuste no puede ser 0',
        );
      }

      const lote = await this.loteProductoTerminadoRepository.findById(
        dto.lote_producto_terminado_id,
      );
      if (!lote) {
        throw new ResourceNotFoundError(
          `Lote no encontrado (lote_producto_terminado_id=${dto.lote_producto_terminado_id})`,
        );
      }
      if (!lote.activo) {
        throw new ResourceConflictError(
          `El lote no está activo (lote_producto_terminado_id=${dto.lote_producto_terminado_id})`,
        );
      }

      const resultante = lote.cantidad_actual + dto.cantidad;
      if (resultante < 0) {
        throw new ResourceConflictError(
          `El ajuste dejaría el lote con stock negativo (lote_producto_terminado_id=${dto.lote_producto_terminado_id}, actual: ${lote.cantidad_actual}, ajuste: ${dto.cantidad})`,
        );
      }

      params.push({
        lote_producto_terminado_id: lote.id,
        tipo: TipoMovimientoProductoTerminado.AJUSTE,
        cantidad: dto.cantidad,
        razon: dto.razon,
      });
    }

    return this.movimientoProductoTerminadoRepository.createMany(params);
  }
}
