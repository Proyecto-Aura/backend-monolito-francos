import { Injectable } from '@nestjs/common';
import { LoteInsumoEntity } from '../../../domain/entities';
import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';
import { LoteInsumoRepository } from '../../../domain/repositories/lote-insumo.repository';

@Injectable()
export class ChangeLoteInsumoStatusUseCase {
  constructor(private readonly loteInsumoRepository: LoteInsumoRepository) {}

  async execute(id: number, activo: boolean): Promise<LoteInsumoEntity> {
    const lote = await this.loteInsumoRepository.findById(id);
    if (!lote) {
      throw new ResourceNotFoundError('Lote no encontrado');
    }
    return this.loteInsumoRepository.setActivo(id, activo);
  }
}
