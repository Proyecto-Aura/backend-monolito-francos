import { Injectable } from '@nestjs/common';
import { IndicadoresSolicitudProduccion } from '../../../domain/repositories/types/solicitud-produccion-repository.types';
import { SolicitudProduccionRepository } from '../../../domain/repositories/solicitud-produccion.repository';

@Injectable()
export class GetIndicadoresSolicitudProduccionUseCase {
  constructor(
    private readonly solicitudProduccionRepository: SolicitudProduccionRepository,
  ) {}

  async execute(): Promise<IndicadoresSolicitudProduccion> {
    return this.solicitudProduccionRepository.getIndicadores();
  }
}
