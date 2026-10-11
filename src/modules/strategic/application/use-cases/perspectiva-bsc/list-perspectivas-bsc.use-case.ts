import { Injectable } from '@nestjs/common';
import { PerspectivaBscEntity } from '../../../domain/entities';
import { PerspectivaBscRepository } from '../../../domain/repositories/perspectiva-bsc.repository';

@Injectable()
export class ListPerspectivasBscUseCase {
  constructor(
    private readonly perspectivaBscRepository: PerspectivaBscRepository,
  ) {}

  async execute(): Promise<PerspectivaBscEntity[]> {
    return this.perspectivaBscRepository.findAll();
  }
}
