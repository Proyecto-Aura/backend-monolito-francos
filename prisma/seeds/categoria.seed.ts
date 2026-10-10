import { PrismaClient } from '@prisma/client';

// Categorías base del catálogo (HU-A-040) para que el equipo no las cree a mano
// en cada entorno. Es repetible: solo crea las que todavía no existen.
const CATEGORIAS = [
  {
    nombre: 'Chifles',
    descripcion: 'Hojuelas de plátano bellaco en sus distintas variedades.',
  },
  {
    nombre: 'Camote',
    descripcion: 'Hojuelas de camote amarillo y morado.',
  },
  {
    nombre: 'Canchita y maíz',
    descripcion: 'Canchita, maíz chulpe y maíces tostados.',
  },
  {
    nombre: 'Maní y frutos secos',
    descripcion: 'Maní, pecanas y mezclas tostadas.',
  },
  {
    nombre: 'Habas y legumbres',
    descripcion: 'Habas, garbanzos y legumbres tostadas.',
  },
  {
    nombre: 'Mix y surtidos',
    descripcion: 'Combinaciones de snacks en un solo empaque.',
  },
];

export async function seedCategorias(prisma: PrismaClient) {
  let creadas = 0;

  for (const categoria of CATEGORIAS) {
    const existe = await prisma.categoria.findFirst({
      where: { nombre: { equals: categoria.nombre, mode: 'insensitive' } },
      select: { id: true },
    });

    if (!existe) {
      await prisma.categoria.create({ data: { ...categoria, estado: true } });
      creadas++;
    }
  }

  console.log(`Categorías creadas: ${creadas} de ${CATEGORIAS.length}`);
}
