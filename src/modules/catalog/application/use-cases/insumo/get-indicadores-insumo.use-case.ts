import { Injectable } from '@nestjs/common';
import { IndicadoresInsumo } from '../../../domain/repositories/types/insumo-repository.types';
import { InsumoRepository } from '../../../domain/repositories/insumo.repository';

@Injectable()
export class GetIndicadoresInsumoUseCase {
  constructor(private readonly insumoRepository: InsumoRepository) {}

  async execute(): Promise<IndicadoresInsumo> {
    return this.insumoRepository.getIndicadores();
  }
}
