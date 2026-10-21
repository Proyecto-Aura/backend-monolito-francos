import { Injectable } from '@nestjs/common';
import { MovimientoInsumoEntity } from '../../../domain/entities';
import { TipoMovimientoInsumo } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { LoteInsumoRepository } from '../../../domain/repositories/lote-insumo.repository';
import { MovimientoInsumoRepository } from '../../../domain/repositories/movimiento-insumo.repository';
import { CreateAjusteMovimientoDto } from '../../dto/movimiento-insumo-dtos/create-ajuste-movimiento.dto';

@Injectable()
export class RegistrarAjusteInsumoUseCase {
  constructor(
    private readonly movimientoInsumoRepository: MovimientoInsumoRepository,
    private readonly loteInsumoRepository: LoteInsumoRepository,
  ) {}

  async execute(
    dto: CreateAjusteMovimientoDto,
  ): Promise<MovimientoInsumoEntity> {
    if (dto.cantidad === 0) {
      throw new ResourceConflictError('La cantidad del ajuste no puede ser 0');
    }

    const lote = await this.loteInsumoRepository.findById(dto.lote_insumo_id);
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

    return this.movimientoInsumoRepository.create({
      lote_insumo_id: lote.id,
      tipo: TipoMovimientoInsumo.AJUSTE,
      cantidad: dto.cantidad,
      razon: dto.razon,
    });
  }
}
