import { Injectable } from '@nestjs/common';
import { IndicadoresProductoTerminado } from '../../../domain/repositories/types/producto-terminado-repository.types';
import { ProductoTerminadoRepository } from '../../../domain/repositories/producto-terminado.repository';

@Injectable()
export class GetIndicadoresProductoTerminadoUseCase {
  constructor(
    private readonly productoTerminadoRepository: ProductoTerminadoRepository,
  ) {}

  async execute(): Promise<IndicadoresProductoTerminado> {
    return this.productoTerminadoRepository.getIndicadores();
  }
}
