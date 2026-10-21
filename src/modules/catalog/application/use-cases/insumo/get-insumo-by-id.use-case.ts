import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';
import { InsumoRepository } from '../../../domain/repositories/insumo.repository';

@Injectable()
export class GetInsumoByIdUseCase {
  constructor(private readonly insumoRepository: InsumoRepository) {}

  async execute(id: number) {
    const insumo = await this.insumoRepository.findById(id);
    if (!insumo) {
      throw new ResourceNotFoundError('Insumo no encontrado');
    }
    return insumo;
  }
}
