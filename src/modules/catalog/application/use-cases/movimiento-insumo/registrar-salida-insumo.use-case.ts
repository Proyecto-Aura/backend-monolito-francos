import { Injectable } from '@nestjs/common';
import { MovimientoInsumoEntity } from '../../../domain/entities';
import { TipoMovimientoInsumo } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { InsumoRepository } from '../../../domain/repositories/insumo.repository';
import { LoteInsumoRepository } from '../../../domain/repositories/lote-insumo.repository';
import { MovimientoInsumoRepository } from '../../../domain/repositories/movimiento-insumo.repository';
import { CreateMovimientoInsumoParams } from '../../../domain/repositories/types/movimiento-insumo-repository.types';
import { CreateSalidaMovimientoDto } from '../../dto/movimiento-insumo-dtos/create-salida-movimiento.dto';

@Injectable()
export class RegistrarSalidaInsumoUseCase {
  constructor(
    private readonly movimientoInsumoRepository: MovimientoInsumoRepository,
    private readonly loteInsumoRepository: LoteInsumoRepository,
    private readonly insumoRepository: InsumoRepository,
  ) {}

  async execute(
    dto: CreateSalidaMovimientoDto,
  ): Promise<MovimientoInsumoEntity[]> {
    const insumo = await this.insumoRepository.findById(dto.insumo_id);
    if (!insumo) {
      throw new ResourceNotFoundError('Insumo no encontrado');
    }
    if (!insumo.estado) {
      throw new ResourceConflictError('El insumo no está activo');
    }

    // FEFO: lotes consumibles ordenados por vencimiento más próximo primero.
    const lotesDisponibles =
      await this.loteInsumoRepository.findDisponiblesParaSalida(insumo.id);

    const stockDisponible = lotesDisponibles.reduce(
      (total, lote) => total + lote.cantidad_actual,
      0,
    );
    if (stockDisponible < dto.cantidad) {
      throw new ResourceConflictError(
        `Stock insuficiente para insumo_id=${insumo.id}. Disponible: ${stockDisponible}, solicitado: ${dto.cantidad}`,
      );
    }

    const movimientosACrear: CreateMovimientoInsumoParams[] = [];
    let pendiente = dto.cantidad;

    for (const lote of lotesDisponibles) {
      if (pendiente <= 0) break;

      const cantidadATomar = Math.min(lote.cantidad_actual, pendiente);
      movimientosACrear.push({
        lote_insumo_id: lote.id,
        tipo: TipoMovimientoInsumo.SALIDA,
        cantidad: cantidadATomar,
        razon: dto.razon,
      });
      pendiente -= cantidadATomar;
    }

    return this.movimientoInsumoRepository.createMany(movimientosACrear);
  }
}
