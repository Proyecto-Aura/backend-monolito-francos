import { EstadoLoteProductoTerminado } from '../enums';
import { UnidadMedidaPresentacion } from '../../../catalog/domain/enums';

// Lote de producción de un producto terminado (OFT0-259), mismo patrón que
// LoteInsumoEntity. No hay CRUD de lotes en este módulo: nacen vía seed o
// (más adelante) desde producción; acá solo se leen y se les aplican
// movimientos.
export class LoteProductoTerminadoEntity {
  constructor(
    public readonly id: number,
    public readonly producto_terminado_id: number,
    // Embebidos para que el front no tenga que resolver el catálogo aparte
    // (mismo criterio que ProductoTerminadoEntity).
    public readonly sku: string,
    public readonly producto_id: number,
    public readonly producto_nombre: string,
    public readonly categoria_id: number,
    public readonly categoria_nombre: string,
    public readonly presentacion_id: number,
    public readonly presentacion_cantidad: number,
    public readonly presentacion_unidad_medida: UnidadMedidaPresentacion,
    public codigo_lote: string,
    public fecha_produccion: Date,
    public fecha_vencimiento: Date | null,
    public readonly cantidad_inicial: number,
    public cantidad_actual: number,
    public estado: EstadoLoteProductoTerminado,
    public activo: boolean,
    public readonly created_at: Date,
    public updated_at: Date,
  ) {}
}
