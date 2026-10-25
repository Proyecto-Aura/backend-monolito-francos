import { PrismaClient } from '@prisma/client';

const ROLES_BASE = [
  'admin',
  'ventas',
  'cliente',
  'inventario',
  'produccion',
  'estrategico',
  'despacho',
];

export async function seedRoles(prisma: PrismaClient) {
  for (const nombre of ROLES_BASE) {
    await prisma.rol.upsert({
      where: { nombre },
      update: {},
      create: { nombre, descripcion: null, estado: true },
    });
    console.log(`Rol "${nombre}" listo`);
  }
}
