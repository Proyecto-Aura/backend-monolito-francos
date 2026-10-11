import { PrismaClient, UnidadMedidaPresentacion } from '@prisma/client';

// Presentaciones base del catálogo (HU-A-041) para que el equipo no las cree a
// mano en cada entorno. Es repetible: solo crea las que todavía no existen.
const PRESENTACIONES = [
  {
    cantidad: 250,
    unidad_medida: UnidadMedidaPresentacion.gr,
    descripcion: 'Bolsa sellada de 250 gramos.',
  },
  {
    cantidad: 500,
    unidad_medida: UnidadMedidaPresentacion.gr,
    descripcion: 'Bolsa sellada de 500 gramos.',
  },
  {
    cantidad: 1,
    unidad_medida: UnidadMedidaPresentacion.kg,
    descripcion: 'Bolsa sellada de 1 kilogramo.',
  },
];

export async function seedPresentaciones(prisma: PrismaClient) {
  let creadas = 0;

  for (const { cantidad, unidad_medida, descripcion } of PRESENTACIONES) {
    const existe = await prisma.presentacion.findFirst({
      where: { cantidad, unidad_medida },
      select: { id: true },
    });

    if (!existe) {
      await prisma.presentacion.create({
        data: { cantidad, unidad_medida, descripcion, estado: true },
      });
      creadas++;
    }
  }

  console.log(`Presentaciones creadas: ${creadas} de ${PRESENTACIONES.length}`);
}
