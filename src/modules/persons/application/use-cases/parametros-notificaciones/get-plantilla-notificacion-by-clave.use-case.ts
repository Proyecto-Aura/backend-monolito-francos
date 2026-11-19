import { Injectable } from '@nestjs/common';
import { PlantillaNotificacionEntity } from '../../../domain/entities/plantilla-notificacion.entity';
import { PlantillaNotificacionClave } from '../../../domain/enums/persons.enums';
import { ResourceNotFoundError } from '../../../domain/errors/persons-domain.errors';
import { PlantillaNotificacionRepository } from '../../../domain/repositories/plantilla-notificacion.repository';

@Injectable()
export class GetPlantillaNotificacionByClaveUseCase {
  constructor(
    private readonly plantillaNotificacionRepository: PlantillaNotificacionRepository,
  ) {}

  async execute(
    clave: PlantillaNotificacionClave,
  ): Promise<PlantillaNotificacionEntity> {
    const plantilla =
      await this.plantillaNotificacionRepository.findByClave(clave);
    if (!plantilla) {
      throw new ResourceNotFoundError(
        'Plantilla de notificación no encontrada',
      );
    }
    return plantilla;
  }
}
