import { PrismaClient } from '@prisma/client';

const ESTADOS_OBJETIVO = [
  { codigo: 'PENDIENTE', nombre: 'Pendiente', orden: 1 },
  { codigo: 'EN_PROCESO', nombre: 'En Proceso', orden: 2 },
  { codigo: 'CUMPLIDO', nombre: 'Cumplido', orden: 3 },
  { codigo: 'CANCELADO', nombre: 'Cancelado', orden: 4 },
];

export async function seedEstadoObjetivo(prisma: PrismaClient) {
  for (const item of ESTADOS_OBJETIVO) {
    await prisma.estadoObjetivo.upsert({
      where: { codigo: item.codigo },
      update: {},
      create: { ...item, estado: true },
    });
  }
}
