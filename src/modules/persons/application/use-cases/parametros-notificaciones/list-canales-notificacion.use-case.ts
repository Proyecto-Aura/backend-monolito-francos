import { Injectable } from '@nestjs/common';
import { CanalNotificacionEntity } from '../../../domain/entities/canal-notificacion.entity';
import { CanalNotificacionRepository } from '../../../domain/repositories/canal-notificacion.repository';

@Injectable()
export class ListCanalesNotificacionUseCase {
  constructor(
    private readonly canalNotificacionRepository: CanalNotificacionRepository,
  ) {}

  execute(): Promise<CanalNotificacionEntity[]> {
    return this.canalNotificacionRepository.findAll();
  }
}
