import { PrismaClient, UnidadMedidaPresentacion } from '@prisma/client';

// SOLO PARA DESARROLLO Y PRUEBAS (se carga con SEED_DEMO=true; nunca corre en
// AWS ni va en una migración). Para probar la regla de HU-A-008 (no desactivar
// un producto con stock) se crean dos productos visibles en el portal del
// cliente: uno con stock, que el sistema no deja desactivar, y otro sin stock,
// que sí se puede desactivar y reactivar. Es repetible: si ya existen, no hace
// nada.
const PRODUCTOS_DEMO = [
  {
    sku: 'DEMO-STOCK-CON',
    nombre: 'Chifles (demo) con stock',
    stock: 25,
  },
  {
    sku: 'DEMO-STOCK-SIN',
    nombre: 'Chifles (demo) sin stock',
    stock: 0,
  },
];

export async function seedDemoStockProductos(prisma: PrismaClient) {
  if (process.env.SEED_DEMO !== 'true') {
    return;
  }

  const categoria = await prisma.categoria.findFirst({
    where: { nombre: 'Chifles' },
  });
  const presentacion = await prisma.presentacion.findFirst({
    where: { cantidad: 250, unidad_medida: UnidadMedidaPresentacion.gr },
  });

  if (!categoria || !presentacion) {
    console.log(
      'Faltan la categoría Chifles o la presentación de 250 gr; se omite la demo de stock',
    );
    return;
  }

  let creados = 0;
  for (const demo of PRODUCTOS_DEMO) {
    if (
      await prisma.productoPresentacion.findUnique({ where: { sku: demo.sku } })
    ) {
      continue;
    }

    await prisma.productoPresentacion.create({
      data: {
        sku: demo.sku,
        precio_unitario: 8.5,
        visible_portal_b: true,
        producto: {
          create: { categoria_id: categoria.id, nombre: demo.nombre },
        },
        presentacion: { connect: { id: presentacion.id } },
        producto_terminado: { create: { stock_actual: demo.stock } },
      },
    });
    creados++;
  }

  console.log(
    creados > 0
      ? `Demo de stock: ${creados} productos creados`
      : 'Demo de stock ya cargada',
  );
}
