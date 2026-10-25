// Mismo criterio que los KPI de /productos-terminados/indicadores (módulo
// inventory), expuesto acá como filtro de GET /producto-presentaciones.
export enum NivelStockProductoTerminado {
  AGOTADO = 'agotado',
  BAJO = 'bajo',
  NORMAL = 'normal',
  ALTO = 'alto',
}
