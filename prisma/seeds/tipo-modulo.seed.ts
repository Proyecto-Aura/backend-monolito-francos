import { PrismaClient } from '@prisma/client';

const TIPOS = [
  { codigo: 'NEG', nombre: 'Negocio' },
  { codigo: 'TI', nombre: 'TI' },
];

export async function seedTipoModulo(prisma: PrismaClient) {
  for (const item of TIPOS) {
    await prisma.tipoModulo.upsert({
      where: { codigo: item.codigo },
      update: {},
      create: { ...item, estado: true },
    });
  }
}
