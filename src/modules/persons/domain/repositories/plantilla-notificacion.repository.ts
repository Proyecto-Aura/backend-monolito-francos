import { PlantillaNotificacionEntity } from '../entities/plantilla-notificacion.entity';
import { PlantillaNotificacionClave } from '../enums/persons.enums';
import { UpdatePlantillaNotificacionParams } from './types/plantilla-notificacion-repository.types';

export abstract class PlantillaNotificacionRepository {
  abstract findAll(): Promise<PlantillaNotificacionEntity[]>;
  abstract findByClave(
    clave: PlantillaNotificacionClave,
  ): Promise<PlantillaNotificacionEntity | null>;
  abstract update(
    clave: PlantillaNotificacionClave,
    params: UpdatePlantillaNotificacionParams,
  ): Promise<PlantillaNotificacionEntity>;
}
