import { PlantillaNotificacion as PrismaPlantillaNotificacion } from '@prisma/client';
import { PlantillaNotificacionEntity } from '../../domain/entities/plantilla-notificacion.entity';
import {
  PlantillaNotificacionClave,
  PlantillaNotificacionDestinatario,
} from '../../domain/enums/persons.enums';

export class PlantillaNotificacionMapper {
  static toDomain(
    plantilla: PrismaPlantillaNotificacion,
  ): PlantillaNotificacionEntity {
    return new PlantillaNotificacionEntity(
      plantilla.id,
      plantilla.clave as PlantillaNotificacionClave,
      plantilla.nombre,
      plantilla.destinatario as PlantillaNotificacionDestinatario,
      plantilla.variables as string[],
      plantilla.asunto,
      plantilla.cuerpo,
      plantilla.updated_at,
    );
  }
}
