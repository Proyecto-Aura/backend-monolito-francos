import { PrismaClient } from '@prisma/client';

// Cada presentación debe tener su producto terminado (RF-A024). Las que se
// crearon antes de que existiera la tabla quedan con stock 0 y mínimo 1 (valores
// por defecto). Es repetible: solo rellena las que todavía no lo tienen.
export async function seedProductoTerminado(prisma: PrismaClient) {
  const sinProductoTerminado = await prisma.productoPresentacion.findMany({
    where: { producto_terminado: null },
    select: { id: true },
  });

  if (sinProductoTerminado.length > 0) {
    await prisma.productoTerminado.createMany({
      data: sinProductoTerminado.map(({ id }) => ({
        producto_presentacion_id: id,
      })),
      skipDuplicates: true,
    });
  }

  console.log(
    `Productos terminados creados para ${sinProductoTerminado.length} presentaciones existentes`,
  );
}
