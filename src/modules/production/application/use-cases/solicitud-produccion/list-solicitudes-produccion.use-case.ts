import { Injectable } from '@nestjs/common';
import { SolicitudProduccionEntity } from '../../../domain/entities';
import { SolicitudProduccionRepository } from '../../../domain/repositories/solicitud-produccion.repository';
import { PaginatedResult } from '../../../../catalog/domain/repositories/types/pagination.types';
import { ListSolicitudProduccionQueryDto } from '../../dto/solicitud-produccion-dtos/list-solicitud-produccion-query.dto';
import { rangoFechasLima } from '../../../../inventory/application/utils/fecha-rango.utils';

@Injectable()
export class ListSolicitudesProduccionUseCase {
  constructor(
    private readonly solicitudProduccionRepository: SolicitudProduccionRepository,
  ) {}

  async execute(
    dto: ListSolicitudProduccionQueryDto,
  ): Promise<PaginatedResult<SolicitudProduccionEntity>> {
    const { desde, hasta } = rangoFechasLima(dto.fecha_desde, dto.fecha_hasta);

    return this.solicitudProduccionRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      estado: dto.estado,
      fecha_desde: desde,
      fecha_hasta: hasta,
    });
  }
}
