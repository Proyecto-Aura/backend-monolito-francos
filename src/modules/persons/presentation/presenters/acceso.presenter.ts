import { AccesoEntity } from '../../domain/entities/acceso.entity';

export class AccesoPresenter {
  static toHttp(acceso: AccesoEntity) {
    return {
      id: acceso.id,
      rol_id: acceso.rol_id,
      ruta_id: acceso.ruta_id,
      estado: acceso.estado,
      created_at: acceso.created_at,
      updated_at: acceso.updated_at,
    };
  }
}
