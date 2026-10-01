import { PrismaClient } from '@prisma/client';

const ESTADOS = [
  { codigo: 'BORRADOR', nombre: 'Borrador', orden: 1 },
  { codigo: 'ACTIVO', nombre: 'Activo', orden: 2 },
  { codigo: 'CERRADO', nombre: 'Cerrado', orden: 3 },
];

export async function seedEstadoPlanEstrategico(prisma: PrismaClient) {
  for (const item of ESTADOS) {
    await prisma.estadoPlanEstrategico.upsert({
      where: { codigo: item.codigo },
      update: {},
      create: { ...item, estado: true },
    });
    console.log(`Estado de plan "${item.codigo}" listo`);
  }
}
