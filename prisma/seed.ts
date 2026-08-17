import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const ROLES_BASE = ['admin', 'ventas', 'cliente'];

async function main() {
  for (const nombre of ROLES_BASE) {
    await prisma.rol.upsert({
      where: { nombre },
      update: {},
      create: { nombre, descripcion: null, estado: true },
    });
    console.log(`Rol "${nombre}" listo`);
  }
}

main()
  .then(() => {
    console.log('Seed completado');
  })
  .catch((error) => {
    console.error('Error al ejecutar el seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
