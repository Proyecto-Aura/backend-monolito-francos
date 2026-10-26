import { Injectable } from '@nestjs/common';
import { MovimientoProductoTerminadoEntity } from '../../../domain/entities';
import { TipoMovimientoProductoTerminado } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { LoteProductoTerminadoRepository } from '../../../domain/repositories/lote-producto-terminado.repository';
import { MovimientoProductoTerminadoRepository } from '../../../domain/repositories/movimiento-producto-terminado.repository';
import { ProductoTerminadoRepository } from '../../../domain/repositories/producto-terminado.repository';
import { CreateMovimientoProductoTerminadoParams } from '../../../domain/repositories/types/movimiento-producto-terminado-repository.types';
import { CreateSalidaMovimientoProductoTerminadoDto } from '../../dto/movimiento-producto-terminado-dtos/create-salida-movimiento.dto';

@Injectable()
export class RegistrarSalidaProductoTerminadoUseCase {
  constructor(
    private readonly movimientoProductoTerminadoRepository: MovimientoProductoTerminadoRepository,
    private readonly loteProductoTerminadoRepository: LoteProductoTerminadoRepository,
    private readonly productoTerminadoRepository: ProductoTerminadoRepository,
  ) {}

  async execute(
    dto: CreateSalidaMovimientoProductoTerminadoDto,
  ): Promise<MovimientoProductoTerminadoEntity[]> {
    return this.executeMany([dto]);
  }

  // Varias filas (posiblemente del mismo producto) en un mismo envío, todas
  // en una sola transacción vía createMany. `reservadoPorLote` lleva la
  // cuenta de lo que ya planificaron filas anteriores de este mismo envío
  // sobre un lote, para no repartir FEFO dos veces sobre el mismo saldo: la
  // validación final de stock sigue siendo el trigger (FOR UPDATE), esto
  // solo evita que el reparto en memoria se pise a sí mismo.
  async executeMany(
    dtos: CreateSalidaMovimientoProductoTerminadoDto[],
  ): Promise<MovimientoProductoTerminadoEntity[]> {
    const reservadoPorLote = new Map<number, number>();
    const movimientosACrear: CreateMovimientoProductoTerminadoParams[] = [];

    for (const dto of dtos) {
      const productoTerminado = await this.productoTerminadoRepository.findById(
        dto.producto_terminado_id,
      );
      if (!productoTerminado) {
        throw new ResourceNotFoundError(
          `Producto terminado no encontrado (producto_terminado_id=${dto.producto_terminado_id})`,
        );
      }
      if (!productoTerminado.estado) {
        throw new ResourceConflictError(
          `El producto no está activo (producto_terminado_id=${dto.producto_terminado_id})`,
        );
      }

      // FEFO: lotes consumibles ordenados por vencimiento más próximo primero.
      const lotesDisponibles =
        await this.loteProductoTerminadoRepository.findDisponiblesParaSalida(
          productoTerminado.id,
        );
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
          `Stock insuficiente para producto_terminado_id=${productoTerminado.id}. Disponible: ${stockDisponible}, solicitado: ${dto.cantidad}`,
        );
      }

      let pendiente = dto.cantidad;
      for (const { lote, saldo } of lotesConSaldo) {
        if (pendiente <= 0) break;
        if (saldo <= 0) continue;

        const cantidadATomar = Math.min(saldo, pendiente);
        movimientosACrear.push({
          lote_producto_terminado_id: lote.id,
          tipo: TipoMovimientoProductoTerminado.SALIDA,
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

    return this.movimientoProductoTerminadoRepository.createMany(
      movimientosACrear,
    );
  }
}
