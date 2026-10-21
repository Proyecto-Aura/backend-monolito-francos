import { Injectable } from '@nestjs/common';
import { InsumoEntity } from '../../../domain/entities';
import { ResourceNotFoundError } from '../../../../catalog/domain/errors/catalog-domain.errors';
import { InsumoRepository } from '../../../domain/repositories/insumo.repository';

@Injectable()
export class ChangeInsumoStatusUseCase {
  constructor(private readonly insumoRepository: InsumoRepository) {}

  async execute(id: number, estado: boolean): Promise<InsumoEntity> {
    const insumo = await this.insumoRepository.findById(id);
    if (!insumo) {
      throw new ResourceNotFoundError('Insumo no encontrado');
    }
    return this.insumoRepository.setStatus(id, estado);
  }
}
