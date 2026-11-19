import { Injectable } from '@nestjs/common';
import { PlantillaNotificacionEntity } from '../../../domain/entities/plantilla-notificacion.entity';
import { PlantillaNotificacionRepository } from '../../../domain/repositories/plantilla-notificacion.repository';

@Injectable()
export class ListPlantillasNotificacionUseCase {
  constructor(
    private readonly plantillaNotificacionRepository: PlantillaNotificacionRepository,
  ) {}

  execute(): Promise<PlantillaNotificacionEntity[]> {
    return this.plantillaNotificacionRepository.findAll();
  }
}
