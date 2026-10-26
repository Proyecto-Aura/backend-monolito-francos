import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../../catalog/domain/errors/catalog-domain.errors';
import { LoteProductoTerminadoRepository } from '../../../domain/repositories/lote-producto-terminado.repository';

@Injectable()
export class GetLoteProductoTerminadoByIdUseCase {
  constructor(
    private readonly loteProductoTerminadoRepository: LoteProductoTerminadoRepository,
  ) {}

  async execute(id: number) {
    const lote = await this.loteProductoTerminadoRepository.findById(id);
    if (!lote) {
      throw new ResourceNotFoundError('Lote no encontrado');
    }
    return lote;
  }
}
