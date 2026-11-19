import {
  PlantillaNotificacionClave,
  PlantillaNotificacionDestinatario,
} from '../enums/persons.enums';

export class PlantillaNotificacionEntity {
  constructor(
    public readonly id: string,
    public readonly clave: PlantillaNotificacionClave,
    public readonly nombre: string,
    public readonly destinatario: PlantillaNotificacionDestinatario,
    public readonly variables: string[],
    public asunto: string,
    public cuerpo: string,
    public updated_at: Date,
  ) {}
}
