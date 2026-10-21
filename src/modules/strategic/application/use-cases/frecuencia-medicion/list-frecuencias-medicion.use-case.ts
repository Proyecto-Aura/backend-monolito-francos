import { Injectable } from '@nestjs/common';
import { FrecuenciaMedicionEntity } from '../../../domain/entities';
import { FrecuenciaMedicionRepository } from '../../../domain/repositories/frecuencia-medicion.repository';

@Injectable()
export class ListFrecuenciasMedicionUseCase {
  constructor(
    private readonly frecuenciaMedicionRepository: FrecuenciaMedicionRepository,
  ) {}

  async execute(): Promise<FrecuenciaMedicionEntity[]> {
    return this.frecuenciaMedicionRepository.findAll();
  }
}
