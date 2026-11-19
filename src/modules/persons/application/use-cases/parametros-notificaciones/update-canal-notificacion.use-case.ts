import { Injectable } from '@nestjs/common';
import { CanalNotificacionEntity } from '../../../domain/entities/canal-notificacion.entity';
import { CanalNotificacionTipo } from '../../../domain/enums/persons.enums';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { CanalNotificacionRepository } from '../../../domain/repositories/canal-notificacion.repository';
import { UpdateCanalNotificacionDto } from '../../dto/parametros-notificaciones-dtos/update-canal-notificacion.dto';

@Injectable()
export class UpdateCanalNotificacionUseCase {
  constructor(
    private readonly canalNotificacionRepository: CanalNotificacionRepository,
  ) {}

  async execute(
    tipo: CanalNotificacionTipo,
    dto: UpdateCanalNotificacionDto,
  ): Promise<CanalNotificacionEntity> {
    const canal = await this.canalNotificacionRepository.findByTipo(tipo);
    if (!canal) {
      throw new ResourceNotFoundError('Canal de notificación no encontrado');
    }
    return this.canalNotificacionRepository.update(tipo, dto);
  }
}
