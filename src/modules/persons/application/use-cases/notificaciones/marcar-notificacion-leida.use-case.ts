import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { NotificacionRepository } from '../../../domain/repositories/notificacion.repository';

@Injectable()
export class MarcarNotificacionLeidaUseCase {
  constructor(
    private readonly notificacionRepository: NotificacionRepository,
  ) {}

  async execute(notificacionId: number, userId: string): Promise<void> {
    const marcada = await this.notificacionRepository.marcarLeida(
      notificacionId,
      userId,
    );
    if (!marcada) {
      throw new ResourceNotFoundError(
        'La notificación no existe, no es tuya o ya estaba leída',
      );
    }
  }
}
