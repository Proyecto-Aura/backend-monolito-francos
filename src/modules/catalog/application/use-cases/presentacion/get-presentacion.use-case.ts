import { Injectable } from '@nestjs/common';
import { PresentacionEntity } from '../../../domain/entities/presentacion.entity';
import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';
import { PresentacionRepository } from '../../../domain/repositories/presentacion.repository';

@Injectable()
export class GetPresentacionUseCase {
  constructor(
    private readonly presentacionRepository: PresentacionRepository,
  ) {}

  async execute(id: number): Promise<PresentacionEntity> {
    const presentacion = await this.presentacionRepository.findById(id);

    if (!presentacion) {
      throw new ResourceNotFoundError('Presentación no encontrada');
    }

    return presentacion;
  }
}
