import { Injectable } from '@nestjs/common';
import { MovimientoInsumoEntity } from '../../../domain/entities';
import { TipoMovimientoInsumo } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
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
    return this.executeMany([dto]);
  }

  // Varias filas (posiblemente del mismo insumo) en un mismo envío, todas en
  // una sola transacción vía createMany. `reservadoPorLote` lleva la cuenta
  // de lo que ya planificaron filas anteriores de este mismo envío sobre un
  // lote, para no repartir FEFO dos veces sobre el mismo saldo: la validación
  // final de stock sigue siendo el trigger (FOR UPDATE), esto solo evita que
  // el reparto en memoria se pise a sí mismo.
  async executeMany(
    dtos: CreateSalidaMovimientoDto[],
  ): Promise<MovimientoInsumoEntity[]> {
    const reservadoPorLote = new Map<number, number>();
    const movimientosACrear: CreateMovimientoInsumoParams[] = [];

    for (const dto of dtos) {
      const insumo = await this.insumoRepository.findById(dto.insumo_id);
      if (!insumo) {
        throw new ResourceNotFoundError(
          `Insumo no encontrado (insumo_id=${dto.insumo_id})`,
        );
      }
      if (!insumo.estado) {
        throw new ResourceConflictError(
          `El insumo no está activo (insumo_id=${dto.insumo_id})`,
        );
      }

      // FEFO: lotes consumibles ordenados por vencimiento más próximo primero.
      const lotesDisponibles =
        await this.loteInsumoRepository.findDisponiblesParaSalida(insumo.id);
      const lotesConSaldo = lotesDisponibles.map((lote) => ({
        lote,
        saldo: lote.cantidad_actual - (reservadoPorLote.get(lote.id) ?? 0),
      }));

      const stockDisponible = lotesConSaldo.reduce(
        (total, { saldo }) => total + saldo,
        0,
      );
      if (stockDisponible < dto.cantidad) {
        throw new ResourceConflictError(
          `Stock insuficiente para insumo_id=${insumo.id}. Disponible: ${stockDisponible}, solicitado: ${dto.cantidad}`,
        );
      }

      let pendiente = dto.cantidad;
      for (const { lote, saldo } of lotesConSaldo) {
        if (pendiente <= 0) break;
        if (saldo <= 0) continue;

        const cantidadATomar = Math.min(saldo, pendiente);
        movimientosACrear.push({
          lote_insumo_id: lote.id,
          tipo: TipoMovimientoInsumo.SALIDA,
          cantidad: cantidadATomar,
          razon: dto.razon,
        });
        reservadoPorLote.set(
          lote.id,
          (reservadoPorLote.get(lote.id) ?? 0) + cantidadATomar,
        );
        pendiente -= cantidadATomar;
      }
    }

    return this.movimientoInsumoRepository.createMany(movimientosACrear);
  }
}
