import { Injectable } from '@nestjs/common';
import { NotificacionRepository } from '../../../domain/repositories/notificacion.repository';
import { PaginatedResult } from '../../../domain/repositories/types/pagination.types';
import { NotificacionDeUsuario } from '../../../domain/repositories/types/notificacion-repository.types';
import { ListNotificacionesQueryDto } from '../../dto/notificacion-dtos/list-notificaciones-query.dto';

@Injectable()
export class ListNotificacionesUseCase {
  constructor(
    private readonly notificacionRepository: NotificacionRepository,
  ) {}

  execute(
    dto: ListNotificacionesQueryDto,
    userId: string,
  ): Promise<PaginatedResult<NotificacionDeUsuario>> {
    return this.notificacionRepository.findManyDeUsuario(userId, {
      page: dto.page,
      limit: dto.limit,
      leido: dto.leido,
    });
  }
}
