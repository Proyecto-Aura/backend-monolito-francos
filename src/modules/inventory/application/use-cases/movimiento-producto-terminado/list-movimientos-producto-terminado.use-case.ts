import { Injectable } from '@nestjs/common';
import { MovimientoProductoTerminadoEntity } from '../../../domain/entities';
import { MovimientoProductoTerminadoRepository } from '../../../domain/repositories/movimiento-producto-terminado.repository';
import { PaginatedResult } from '../../../../catalog/domain/repositories/types/pagination.types';
import { ListMovimientosProductoTerminadoQueryDto } from '../../dto/movimiento-producto-terminado-dtos/list-movimientos-query.dto';
import { rangoFechasLima } from '../../utils/fecha-rango.utils';

@Injectable()
export class ListMovimientosProductoTerminadoUseCase {
  constructor(
    private readonly movimientoProductoTerminadoRepository: MovimientoProductoTerminadoRepository,
  ) {}

  async execute(
    dto: ListMovimientosProductoTerminadoQueryDto,
  ): Promise<PaginatedResult<MovimientoProductoTerminadoEntity>> {
    const { desde, hasta } = rangoFechasLima(dto.fecha_desde, dto.fecha_hasta);

    return this.movimientoProductoTerminadoRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      producto_terminado_id: dto.producto_terminado_id,
      lote_producto_terminado_id: dto.lote_producto_terminado_id,
      tipo: dto.tipo,
      fecha_desde: desde,
      fecha_hasta: hasta,
    });
  }
}
