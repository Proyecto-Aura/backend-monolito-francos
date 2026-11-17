import { ResourceConflictError } from '../../../catalog/domain/errors/catalog-domain.errors';

export function validateStockRange(
  stockMinimo: number,
  stockMaximo: number | null | undefined,
): void {
  if (
    stockMaximo !== null &&
    stockMaximo !== undefined &&
    stockMaximo < stockMinimo
  ) {
    throw new ResourceConflictError(
      'El stock máximo debe ser mayor o igual que el stock mínimo',
    );
  }
}
