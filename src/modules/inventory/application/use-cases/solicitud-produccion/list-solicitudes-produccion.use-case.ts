import { Injectable } from '@nestjs/common';
import { SolicitudProduccionEntity } from '../../../domain/entities';
import { SolicitudProduccionRepository } from '../../../domain/repositories/solicitud-produccion.repository';
import { PaginatedResult } from '../../../../catalog/domain/repositories/types/pagination.types';
import { ListSolicitudProduccionQueryDto } from '../../dto/solicitud-produccion-dtos/list-solicitud-produccion-query.dto';

@Injectable()
export class ListSolicitudesProduccionUseCase {
  constructor(
    private readonly solicitudProduccionRepository: SolicitudProduccionRepository,
  ) {}

  async execute(
    dto: ListSolicitudProduccionQueryDto,
  ): Promise<PaginatedResult<SolicitudProduccionEntity>> {
    return this.solicitudProduccionRepository.findMany({
      page: dto.page,
      limit: dto.limit,
      search: dto.search,
      estado: dto.estado,
      fecha_desde: dto.fecha_desde ? new Date(dto.fecha_desde) : undefined,
      fecha_hasta: dto.fecha_hasta ? new Date(dto.fecha_hasta) : undefined,
    });
  }
}
