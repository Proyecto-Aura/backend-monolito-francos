import { PrismaClient } from '@prisma/client';

const UNIDADES = [
  { nombre: 'Porcentaje', simbolo: '%', decimales: 2 },
  { nombre: 'Soles', simbolo: 'S/', decimales: 2 },
  { nombre: 'Unidades', simbolo: 'und', decimales: 0 },
  { nombre: 'Días', simbolo: 'd', decimales: 1 },
  { nombre: 'Horas', simbolo: 'h', decimales: 1 },
  { nombre: 'Ratio', simbolo: 'x', decimales: 2 },
  { nombre: 'Puntaje', simbolo: 'pts', decimales: 1 },
];

export async function seedUnidadMedidaKpi(prisma: PrismaClient) {
  for (const item of UNIDADES) {
    await prisma.unidadMedidaKpi.upsert({
      where: { nombre: item.nombre },
      update: {},
      create: { ...item, estado: true },
    });
    console.log(`Unidad de medida "${item.nombre}" lista`);
  }
}
