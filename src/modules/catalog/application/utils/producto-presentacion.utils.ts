import { PresentacionEntity } from '../../domain/entities/presentacion.entity';
import { ResourceConflictError } from '../../domain/errors/catalog-domain.errors';

export function createProductoPresentacionSku(
  productoId: number,
  presentacionId: number,
): string {
  return `FR-P${productoId}-PR${presentacionId}`;
}

export function createProductoPresentacionSlug(
  nombreProducto: string,
  presentacion: Pick<PresentacionEntity, 'id' | 'cantidad' | 'unidad_medida'>,
): string {
  const nombreNormalizado =
    nombreProducto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'producto';
  const sufijo = `${presentacion.cantidad}-${presentacion.unidad_medida}-p${presentacion.id}`;
  const longitudMaximaNombre = 100 - sufijo.length - 1;

  return `${nombreNormalizado.slice(0, longitudMaximaNombre)}-${sufijo}`;
}

export function validateWholesalePrice(
  precioUnitario: number,
  precioMayorista: number | null | undefined,
  umbralMayorista: number | null | undefined,
): void {
  const tienePrecioMayorista =
    precioMayorista !== null && precioMayorista !== undefined;
  const tieneUmbralMayorista =
    umbralMayorista !== null && umbralMayorista !== undefined;

  if (tienePrecioMayorista !== tieneUmbralMayorista) {
    throw new ResourceConflictError(
      'El precio mayorista y el umbral mayorista deben enviarse juntos',
    );
  }

  if (tienePrecioMayorista && precioMayorista >= precioUnitario) {
    throw new ResourceConflictError(
      'El precio mayorista debe ser menor que el precio unitario',
    );
  }
}

interface PromocionData {
  tipo: string;
  valor: number;
  cantidad_paga?: number | null;
  cantidad_lleva?: number | null;
  cantidad_minima?: number | null;
  producto_presentacion_regalo_id?: number | null;
  fecha_inicio: Date;
  fecha_fin: Date;
}

export function validatePromocion(promocion: PromocionData): void {
  if (promocion.fecha_fin < promocion.fecha_inicio) {
    throw new ResourceConflictError(
      'La fecha fin de la promoción no puede ser anterior a la fecha de inicio',
    );
  }

  if (promocion.tipo === 'porcentaje' && promocion.valor > 100) {
    throw new ResourceConflictError(
      'El porcentaje de la promoción no puede ser mayor a 100',
    );
  }

  if (promocion.tipo === 'nxm') {
    if (promocion.cantidad_paga == null || promocion.cantidad_lleva == null) {
      throw new ResourceConflictError(
        'Las promociones nxm requieren cantidad_paga y cantidad_lleva',
      );
    }

    if (promocion.cantidad_lleva <= promocion.cantidad_paga) {
      throw new ResourceConflictError(
        'La cantidad_lleva debe ser mayor que la cantidad_paga',
      );
    }
  }

  if (
    promocion.tipo === 'regalo' &&
    (promocion.cantidad_minima == null ||
      promocion.producto_presentacion_regalo_id == null)
  ) {
    throw new ResourceConflictError(
      'Las promociones de regalo requieren cantidad_minima y producto_presentacion_regalo_id',
    );
  }
}
