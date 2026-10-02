import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedRoles } from './seeds/roles.seed';
import { seedAdmin } from './seeds/admin.seed';
import { seedEstadoPlanEstrategico } from './seeds/estado-plan-estrategico.seed';
import { seedPerspectivaBsc } from './seeds/perspectiva-bsc.seed';
import { seedTipoModulo } from './seeds/tipo-modulo.seed';
import { seedEstadoObjetivo } from './seeds/estado-objetivo.seed';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  await seedRoles(prisma);
  await seedAdmin(prisma);
  await seedEstadoPlanEstrategico(prisma);
  await seedPerspectivaBsc(prisma);
  await seedTipoModulo(prisma);
  await seedEstadoObjetivo(prisma);
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
