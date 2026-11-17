import { Injectable } from '@nestjs/common';
import { MovimientoInsumoEntity } from '../../../domain/entities';
import { MovimientoInsumoRepository } from '../../../domain/repositories/movimiento-insumo.repository';
import { PaginatedResult } from '../../../../catalog/domain/repositories/types/pagination.types';
import { ListMovimientosQueryDto } from '../../dto/movimiento-insumo-dtos/list-movimientos-query.dto';
import { rangoFechasLima } from '../../utils/fecha-rango.utils';

@Injectable()
export class ListMovimientosUseCase {
  constructor(
    private readonly movimientoInsumoRepository: MovimientoInsumoRepository,
  ) {}

  async execute(
    dto: ListMovimientosQueryDto,
  ): Promise<PaginatedResult<MovimientoInsumoEntity>> {
    const { desde, hasta } = rangoFechasLima(dto.fecha_desde, dto.fecha_hasta);

    return this.movimientoInsumoRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      insumo_id: dto.insumo_id,
      lote_insumo_id: dto.lote_insumo_id,
      tipo: dto.tipo,
      fecha_desde: desde,
      fecha_hasta: hasta,
    });
  }
}
