import { Injectable } from '@nestjs/common';
import { MovimientoProductoTerminadoEntity } from '../../../domain/entities';
import { MovimientoProductoTerminadoRepository } from '../../../domain/repositories/movimiento-producto-terminado.repository';
import { PaginatedResult } from '../../../../catalog/domain/repositories/types/pagination.types';
import { ListMovimientosProductoTerminadoQueryDto } from '../../dto/movimiento-producto-terminado-dtos/list-movimientos-query.dto';

@Injectable()
export class ListMovimientosProductoTerminadoUseCase {
  constructor(
    private readonly movimientoProductoTerminadoRepository: MovimientoProductoTerminadoRepository,
  ) {}

  async execute(
    dto: ListMovimientosProductoTerminadoQueryDto,
  ): Promise<PaginatedResult<MovimientoProductoTerminadoEntity>> {
    return this.movimientoProductoTerminadoRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      producto_terminado_id: dto.producto_terminado_id,
      lote_producto_terminado_id: dto.lote_producto_terminado_id,
      tipo: dto.tipo,
      fecha_desde: dto.fecha_desde ? new Date(dto.fecha_desde) : undefined,
      fecha_hasta: dto.fecha_hasta ? new Date(dto.fecha_hasta) : undefined,
    });
  }
}
