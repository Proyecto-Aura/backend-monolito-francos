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
import { CreateEntradaMovimientoProductoTerminadoDto } from '../../dto/movimiento-producto-terminado-dtos/create-entrada-movimiento.dto';

// Para sumar cantidad a un lote YA existente (p.ej. una hornada adicional del
// mismo lote de producción). Los lotes nuevos no se crean desde acá (ver
// LoteProductoTerminadoRepository).
@Injectable()
export class RegistrarEntradaProductoTerminadoUseCase {
  constructor(
    private readonly movimientoProductoTerminadoRepository: MovimientoProductoTerminadoRepository,
    private readonly loteProductoTerminadoRepository: LoteProductoTerminadoRepository,
  ) {}

  async execute(
    dto: CreateEntradaMovimientoProductoTerminadoDto,
  ): Promise<MovimientoProductoTerminadoEntity> {
    const lote = await this.loteProductoTerminadoRepository.findById(
      dto.lote_producto_terminado_id,
    );
    if (!lote) {
      throw new ResourceNotFoundError('Lote no encontrado');
    }
    if (!lote.activo) {
      throw new ResourceConflictError('El lote no está activo');
    }

    return this.movimientoProductoTerminadoRepository.create({
      lote_producto_terminado_id: lote.id,
      tipo: TipoMovimientoProductoTerminado.ENTRADA,
      cantidad: dto.cantidad,
      razon: dto.razon,
    });
  }

  // Varias filas en un mismo envío (p.ej. un form con varias líneas), todas
  // en una sola transacción vía createMany: o se guardan todas o ninguna.
  async executeMany(
    dtos: CreateEntradaMovimientoProductoTerminadoDto[],
  ): Promise<MovimientoProductoTerminadoEntity[]> {
    const params: CreateMovimientoProductoTerminadoParams[] = [];

    for (const dto of dtos) {
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

      params.push({
        lote_producto_terminado_id: lote.id,
        tipo: TipoMovimientoProductoTerminado.ENTRADA,
        cantidad: dto.cantidad,
        razon: dto.razon,
      });
    }

    return this.movimientoProductoTerminadoRepository.createMany(params);
  }
}
