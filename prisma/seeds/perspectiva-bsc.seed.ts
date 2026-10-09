import { PrismaClient } from '@prisma/client';

const PERSPECTIVAS = [
  { nombre: 'Financiera', orden: 1 },
  { nombre: 'Cliente', orden: 2 },
  { nombre: 'Procesos Internos', orden: 3 },
  { nombre: 'Aprendizaje y Crecimiento', orden: 4 },
];

export async function seedPerspectivaBsc(prisma: PrismaClient) {
  for (const item of PERSPECTIVAS) {
    await prisma.perspectivaBsc.upsert({
      where: { nombre: item.nombre },
      update: {},
      create: { ...item, estado: true },
    });
  }
}
