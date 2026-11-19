import { PlantillaNotificacionEntity } from '../../domain/entities/plantilla-notificacion.entity';

export class PlantillaNotificacionPresenter {
  static toHttp(plantilla: PlantillaNotificacionEntity) {
    return {
      clave: plantilla.clave,
      nombre: plantilla.nombre,
      destinatario: plantilla.destinatario,
      variables: plantilla.variables,
      asunto: plantilla.asunto,
      cuerpo: plantilla.cuerpo,
      updated_at: plantilla.updated_at,
    };
  }

  static listToHttp(plantillas: PlantillaNotificacionEntity[]) {
    return plantillas.map((plantilla) => this.toHttp(plantilla));
  }
}
