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
