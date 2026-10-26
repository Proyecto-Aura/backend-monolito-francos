import { PrismaClient, UnidadMedidaPresentacion } from '@prisma/client';

// Lotes de ejemplo para poder probar movimientos de producto terminado
// (entrada/salida/ajuste, OFT0-259) sin tener que armar el catálogo a mano
// primero. No hay CRUD de lotes de producto terminado (ver
// LoteProductoTerminadoRepository): nacen acá o, más adelante, desde
// producción. Es repetible: si el producto demo ya existe, no hace nada.
const SKU_DEMO = 'DEMO-MOV-PT-001';

const LOTES_DEMO = [
  {
    codigo_lote: 'LOTE-DEMO-PT-001',
    fecha_produccion: '2026-10-01',
    fecha_vencimiento: '2027-04-01', // lejos: activo
    cantidad_inicial: 100,
  },
  {
    codigo_lote: 'LOTE-DEMO-PT-002',
    fecha_produccion: '2026-10-15',
    fecha_vencimiento: '2026-11-05', // dentro de 15 días: por_vencer
    cantidad_inicial: 50,
  },
  {
    codigo_lote: 'LOTE-DEMO-PT-003',
    fecha_produccion: '2026-08-01',
    fecha_vencimiento: '2026-09-01', // ya pasó: vencido
    cantidad_inicial: 30,
  },
];

export async function seedLotesProductoTerminado(prisma: PrismaClient) {
  const yaExiste = await prisma.productoPresentacion.findUnique({
    where: { sku: SKU_DEMO },
    select: { id: true },
  });
  if (yaExiste) {
    console.log('Lotes de producto terminado: demo ya cargada');
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
      'Faltan la categoría Chifles o la presentación de 250 gr; se omite el seed de lotes de producto terminado',
    );
    return;
  }

  const productoPresentacion = await prisma.productoPresentacion.create({
    data: {
      sku: SKU_DEMO,
      precio_unitario: 8.5,
      producto: {
        create: {
          categoria_id: categoria.id,
          nombre: 'Chifles clásicos (demo movimientos)',
        },
      },
      presentacion: { connect: { id: presentacion.id } },
      producto_terminado: { create: {} },
    },
    include: { producto_terminado: true },
  });
  const productoTerminadoId = productoPresentacion.producto_terminado!.id;

  for (const lote of LOTES_DEMO) {
    // Nace en 0: el movimiento "entrada" de abajo (vía trigger) lo deja en
    // cantidad_inicial, mismo patrón que el alta de un lote de insumo.
    const creado = await prisma.loteProductoTerminado.create({
      data: {
        producto_terminado_id: productoTerminadoId,
        codigo_lote: lote.codigo_lote,
        fecha_produccion: new Date(`${lote.fecha_produccion}T00:00:00.000Z`),
        fecha_vencimiento: new Date(`${lote.fecha_vencimiento}T00:00:00.000Z`),
        cantidad_inicial: lote.cantidad_inicial,
        cantidad_actual: 0,
      },
    });

    await prisma.movimientoProductoTerminado.create({
      data: {
        lote_producto_terminado_id: creado.id,
        tipo: 'entrada',
        cantidad: lote.cantidad_inicial,
        razon: 'Producción inicial de lote (seed)',
      },
    });
  }

  console.log(
    `Lotes de producto terminado: demo cargada (${LOTES_DEMO.length} lotes para "${SKU_DEMO}")`,
  );
}
