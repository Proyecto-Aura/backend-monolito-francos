import { PrismaClient, TipoInsumo, UnidadMedidaInsumo } from '@prisma/client';

// Insumos de ejemplo para que el frontend pueda probar la tabla de stock
// (OFT0-254) contra datos reales desde el primer GET. Repetible: upsert por sku.
const INSUMOS = [
  {
    sku: 'FR-INS-001',
    nombre: 'Harina de trigo',
    unidad_medida: UnidadMedidaInsumo.kg,
    stock_actual: 250,
    stock_minimo: 50,
    stock_maximo: 500,
    tipo: TipoInsumo.materia_prima,
  },
  {
    sku: 'FR-INS-008',
    nombre: 'Cajas de empaque',
    unidad_medida: UnidadMedidaInsumo.unidad,
    stock_actual: 0,
    stock_minimo: 100,
    stock_maximo: 1000,
    tipo: TipoInsumo.empaque,
  },
];

export async function seedInsumos(prisma: PrismaClient) {
  for (const insumo of INSUMOS) {
    await prisma.insumo.upsert({
      where: { sku: insumo.sku },
      update: {},
      create: { ...insumo, estado: true },
    });
    console.log(`Insumo "${insumo.sku}" listo`);
  }
}
