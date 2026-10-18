import { PrismaClient } from '@prisma/client';

const ESTADOS_INICIATIVA = [
  { codigo: 'PENDIENTE', nombre: 'Pendiente', orden: 1 },
  { codigo: 'EN_PROCESO', nombre: 'En Proceso', orden: 2 },
  { codigo: 'COMPLETADA', nombre: 'Completada', orden: 3 },
  { codigo: 'CANCELADA', nombre: 'Cancelada', orden: 4 },
];

export async function seedEstadoIniciativa(prisma: PrismaClient) {
  for (const item of ESTADOS_INICIATIVA) {
    await prisma.estadoIniciativa.upsert({
      where: { codigo: item.codigo },
      update: {},
      create: { ...item, estado: true },
    });
  }
}
