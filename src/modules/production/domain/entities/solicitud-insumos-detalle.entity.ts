import { UnidadMedidaInsumo } from '../../../inventory/domain/enums';

export class SolicitudInsumosDetalleEntity {
  constructor(
    public readonly id: number,
    public readonly solicitud_insumos_id: number,
    public readonly insumo_id: number,
    // Embebidos para que el front no tenga que resolver el insumo aparte,
    // mismo criterio que en movimientos de insumo.
    public readonly insumo_sku: string,
    public readonly insumo_nombre: string,
    public readonly insumo_unidad_medida: UnidadMedidaInsumo,
    // stock_actual del insumo al momento de leer (no se persiste acá): para
    // que el front pinte "stock completo/insuficiente" por línea sin tener
    // que resolver el insumo aparte, mismo criterio que stock_disponible en
    // PedidoDetalle.
    public readonly insumo_stock_actual: number,
    public cantidad_solicitada: number,
    public readonly created_at: Date,
  ) {}
}
