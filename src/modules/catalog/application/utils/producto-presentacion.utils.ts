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

  // HU-A-045: el umbral propio es opcional; sin él rige el global de
  // Parámetros de ventas. Lo que no tiene sentido es un umbral sin precio.
  if (tieneUmbralMayorista && !tienePrecioMayorista) {
    throw new ResourceConflictError(
      'El umbral mayorista requiere un precio mayorista',
    );
  }

  if (tienePrecioMayorista && precioMayorista >= precioUnitario) {
    throw new ResourceConflictError(
      'El precio mayorista debe ser menor que el precio unitario',
    );
  }
}
