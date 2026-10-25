import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../../catalog/domain/errors/catalog-domain.errors';
import { LoteInsumoRepository } from '../../../domain/repositories/lote-insumo.repository';

@Injectable()
export class GetLoteInsumoByIdUseCase {
  constructor(private readonly loteInsumoRepository: LoteInsumoRepository) {}

  async execute(id: number) {
    const lote = await this.loteInsumoRepository.findById(id);
    if (!lote) {
      throw new ResourceNotFoundError('Lote no encontrado');
    }
    return lote;
  }
}
