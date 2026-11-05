import { Injectable } from '@nestjs/common';
import { SolicitudInsumosRepository } from '../../../domain/repositories/solicitud-insumos.repository';
import { SolicitudInsumosResumen } from '../../../domain/repositories/types/solicitud-insumos-repository.types';
import { PaginatedResult } from '../../../../catalog/domain/repositories/types/pagination.types';
import { ListSolicitudInsumosQueryDto } from '../../dto/solicitud-insumos-dtos/list-solicitud-insumos-query.dto';
import { rangoFechasLima } from '../../../../inventory/application/utils/fecha-rango.utils';

@Injectable()
export class ListSolicitudesInsumosUseCase {
  constructor(
    private readonly solicitudInsumosRepository: SolicitudInsumosRepository,
  ) {}

  async execute(
    dto: ListSolicitudInsumosQueryDto,
  ): Promise<PaginatedResult<SolicitudInsumosResumen>> {
    const { desde, hasta } = rangoFechasLima(dto.fecha_desde, dto.fecha_hasta);

    return this.solicitudInsumosRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      estado: dto.estado,
      solicitud_produccion_id: dto.solicitud_produccion_id,
      fecha_desde: desde,
      fecha_hasta: hasta,
      conDisponibilidad: dto.conDisponibilidad,
    });
  }
}
