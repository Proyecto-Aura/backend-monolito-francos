import { Injectable } from '@nestjs/common';
import { MovimientoInsumoEntity } from '../../../domain/entities';
import { TipoMovimientoInsumo } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { LoteInsumoRepository } from '../../../domain/repositories/lote-insumo.repository';
import { MovimientoInsumoRepository } from '../../../domain/repositories/movimiento-insumo.repository';
import { CreateEntradaMovimientoDto } from '../../dto/movimiento-insumo-dtos/create-entrada-movimiento.dto';

// Para sumar cantidad a un lote YA existente (p.ej. una entrega parcial
// adicional del mismo lote). Crear un lote nuevo (POST /lotes-insumo) sigue
// generando su propia "entrada" automática aparte.
@Injectable()
export class RegistrarEntradaInsumoUseCase {
  constructor(
    private readonly movimientoInsumoRepository: MovimientoInsumoRepository,
    private readonly loteInsumoRepository: LoteInsumoRepository,
  ) {}

  async execute(
    dto: CreateEntradaMovimientoDto,
  ): Promise<MovimientoInsumoEntity> {
    const lote = await this.loteInsumoRepository.findById(dto.lote_insumo_id);
    if (!lote) {
      throw new ResourceNotFoundError('Lote no encontrado');
    }
    if (!lote.activo) {
      throw new ResourceConflictError('El lote no está activo');
    }

    return this.movimientoInsumoRepository.create({
      lote_insumo_id: lote.id,
      tipo: TipoMovimientoInsumo.ENTRADA,
      cantidad: dto.cantidad,
      razon: dto.razon,
    });
  }
}
