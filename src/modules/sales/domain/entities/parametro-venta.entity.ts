// Límites del umbral mayorista (RF-A193).
export const UMBRAL_MAYORISTA_MINIMO = 2;
export const UMBRAL_MAYORISTA_MAXIMO = 10000;

export class ParametroVentaEntity {
  constructor(
    public umbral_mayorista_global: number,
    // Si es false, el umbral global rige para todas las presentaciones y se
    // ignoran los umbrales propios.
    public umbral_por_producto: boolean,
    // Interruptor general: apagado, el portal no muestra promociones.
    public promociones_activas: boolean,
    public culqi_activo: boolean,
    public efectivo_activo: boolean,
    public updated_at: Date,
  ) {}
}
