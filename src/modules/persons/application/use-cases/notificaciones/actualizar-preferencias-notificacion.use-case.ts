import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { NotificacionRepository } from '../../../domain/repositories/notificacion.repository';
import { PreferenciasNotificacion } from '../../../domain/repositories/types/notificacion-repository.types';

// HU-B-019: el cliente activa o desactiva los avisos de sus pedidos. El userId
// sale siempre del token: nadie puede cambiar la preferencia de otro.
@Injectable()
export class ActualizarPreferenciasNotificacionUseCase {
  constructor(
    private readonly notificacionRepository: NotificacionRepository,
  ) {}

  async execute(
    userId: string,
    preferencias: PreferenciasNotificacion,
  ): Promise<PreferenciasNotificacion> {
    const actualizado =
      await this.notificacionRepository.actualizarPreferencias(
        userId,
        preferencias,
      );
    if (!actualizado) {
      throw new ResourceNotFoundError('Usuario no encontrado');
    }
    return preferencias;
  }
}
