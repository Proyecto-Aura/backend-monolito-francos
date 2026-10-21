import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';
import { MovimientoInsumoRepository } from '../../../domain/repositories/movimiento-insumo.repository';

@Injectable()
export class GetMovimientoByIdUseCase {
  constructor(
    private readonly movimientoInsumoRepository: MovimientoInsumoRepository,
  ) {}

  async execute(id: number) {
    const movimiento = await this.movimientoInsumoRepository.findById(id);
    if (!movimiento) {
      throw new ResourceNotFoundError('Movimiento no encontrado');
    }
    return movimiento;
  }
}
