import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../../catalog/domain/errors/catalog-domain.errors';
import { MovimientoProductoTerminadoRepository } from '../../../domain/repositories/movimiento-producto-terminado.repository';

@Injectable()
export class GetMovimientoProductoTerminadoByIdUseCase {
  constructor(
    private readonly movimientoProductoTerminadoRepository: MovimientoProductoTerminadoRepository,
  ) {}

  async execute(id: number) {
    const movimiento =
      await this.movimientoProductoTerminadoRepository.findById(id);
    if (!movimiento) {
      throw new ResourceNotFoundError('Movimiento no encontrado');
    }
    return movimiento;
  }
}
