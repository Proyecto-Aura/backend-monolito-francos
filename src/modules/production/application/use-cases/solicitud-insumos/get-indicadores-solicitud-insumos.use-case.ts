import { Injectable } from '@nestjs/common';
import { IndicadoresSolicitudInsumos } from '../../../domain/repositories/types/solicitud-insumos-repository.types';
import { SolicitudInsumosRepository } from '../../../domain/repositories/solicitud-insumos.repository';

@Injectable()
export class GetIndicadoresSolicitudInsumosUseCase {
  constructor(
    private readonly solicitudInsumosRepository: SolicitudInsumosRepository,
  ) {}

  async execute(): Promise<IndicadoresSolicitudInsumos> {
    return this.solicitudInsumosRepository.getIndicadores();
  }
}
