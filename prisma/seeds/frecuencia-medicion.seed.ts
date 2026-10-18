import { PrismaClient } from '@prisma/client';

const FRECUENCIAS = [
  { nombre: 'Mensual', periodos_por_anio: 12, orden: 1 },
  { nombre: 'Bimestral', periodos_por_anio: 6, orden: 2 },
  { nombre: 'Trimestral', periodos_por_anio: 4, orden: 3 },
  { nombre: 'Semestral', periodos_por_anio: 2, orden: 4 },
  { nombre: 'Anual', periodos_por_anio: 1, orden: 5 },
];

export async function seedFrecuenciaMedicion(prisma: PrismaClient) {
  for (const item of FRECUENCIAS) {
    await prisma.frecuenciaMedicion.upsert({
      where: { nombre: item.nombre },
      update: {},
      create: { ...item, estado: true },
    });
    console.log(`Frecuencia "${item.nombre}" lista`);
  }
}
