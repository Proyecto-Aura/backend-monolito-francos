import { Injectable } from '@nestjs/common';
import { PromocionEntity } from '../../../domain/entities';
import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';
import { PromocionRepository } from '../../../domain/repositories/promocion.repository';

@Injectable()
export class GetPromocionByIdUseCase {
  constructor(private readonly promocionRepository: PromocionRepository) {}

  async execute(id: number): Promise<PromocionEntity> {
    const promocion = await this.promocionRepository.findById(id);

    if (!promocion) {
      throw new ResourceNotFoundError('Promoción no encontrada');
    }

    return promocion;
  }
}
