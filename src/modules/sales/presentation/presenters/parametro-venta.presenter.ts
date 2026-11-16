import { ParametroVentaEntity } from '../../domain/entities/parametro-venta.entity';

export class ParametroVentaPresenter {
  static toHttp(parametros: ParametroVentaEntity) {
    return {
      umbral_mayorista_global: parametros.umbral_mayorista_global,
      umbral_por_producto: parametros.umbral_por_producto,
      promociones_activas: parametros.promociones_activas,
      culqi_activo: parametros.culqi_activo,
      efectivo_activo: parametros.efectivo_activo,
      updated_at: parametros.updated_at,
    };
  }

  // Lo único que ve el cliente del portal: qué métodos de pago hay disponibles.
  static metodosPagoToHttp(parametros: ParametroVentaEntity) {
    return {
      culqi: parametros.culqi_activo,
      efectivo: parametros.efectivo_activo,
    };
  }
}
