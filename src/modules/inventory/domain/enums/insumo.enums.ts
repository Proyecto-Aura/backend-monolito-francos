export enum UnidadMedidaInsumo {
  KG = 'kg',
  LITROS = 'litros',
  UNIDAD = 'unidad',
}

export enum TipoInsumo {
  MATERIA_PRIMA = 'materia_prima',
  EMPAQUE = 'empaque',
}

// Mismo criterio que los KPI de /insumos/indicadores, expuesto como filtro.
export enum NivelStockInsumo {
  AGOTADO = 'agotado',
  BAJO = 'bajo',
  NORMAL = 'normal',
  ALTO = 'alto',
}
