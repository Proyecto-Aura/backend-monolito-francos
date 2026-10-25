export interface UpdateProductoTerminadoParams {
  stock_minimo?: number;
  stock_maximo?: number | null;
}

// Conteo de productos terminados por nivel de stock, para los KPI del
// dashboard. Mismo criterio que IndicadoresInsumo, salvo que acá
// stock_maximo puede ser null (sin tope definido): en ese caso nunca cuenta
// como "alto", porque no hay techo contra el cual comparar.
// agotado: stock_actual <= 0
// bajo: stock_actual > 0 y < stock_minimo
// alto: stock_actual >= stock_minimo, con stock_maximo definido y a más del 90%
// normal: todo lo demás (incluye stock_maximo null)
export interface IndicadoresProductoTerminado {
  agotado: number;
  bajo: number;
  normal: number;
  alto: number;
  total: number;
}
