import { PrismaClient, TipoInsumo, UnidadMedidaInsumo } from '@prisma/client';

// Insumos de ejemplo para que el frontend pueda probar la tabla de stock
// (OFT0-254) contra datos reales desde el primer GET. Repetible: se salta el
// que ya exista por nombre.
const INSUMOS = [
  {
    nombre: 'Harina de trigo',
    unidad_medida: UnidadMedidaInsumo.kg,
    stock_actual: 250,
    stock_minimo: 50,
    stock_maximo: 500,
    tipo: TipoInsumo.materia_prima,
  },
  {
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
    const existente = await prisma.insumo.findFirst({
      where: { nombre: insumo.nombre },
      select: { sku: true },
    });
    if (existente) {
      console.log(`Insumo "${existente.sku}" ya existe`);
      continue;
    }

    // El sku sigue el formato FR-INS-{id} que ya usa el alta por API
    // (PrismaInsumoRepository.create): hay que generarlo a partir del id real
    // que asigne la secuencia, no hardcodearlo. Un sku fijo que no coincide
    // con su propio id (ej. "FR-INS-008" en una fila con id=2) queda como una
    // colisión en espera: el día que la secuencia de verdad llegue a 8 vía
    // altas normales, ese insert choca con esta fila sembrada.
    const creado = await prisma.$transaction(async (tx) => {
      const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`
        SELECT nextval(pg_get_serial_sequence('commerce.insumo', 'id')) AS nextval
      `;
      const id = Number(nextval);
      const sku = `FR-INS-${String(id).padStart(3, '0')}`;

      return tx.insumo.create({
        data: { id, sku, ...insumo, estado: true },
      });
    });
    console.log(`Insumo "${creado.sku}" listo`);
  }
}
