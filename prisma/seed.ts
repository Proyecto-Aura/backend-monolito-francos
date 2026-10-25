import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedRoles } from './seeds/roles.seed';
import { seedAdmin } from './seeds/admin.seed';
import { seedEstadoPlanEstrategico } from './seeds/estado-plan-estrategico.seed';
import { seedCategorias } from './seeds/categoria.seed';
import { seedPresentaciones } from './seeds/presentacion.seed';
import { seedPerspectivaBsc } from './seeds/perspectiva-bsc.seed';
import { seedTipoModulo } from './seeds/tipo-modulo.seed';
import { seedEstadoObjetivo } from './seeds/estado-objetivo.seed';
import { seedProductoTerminado } from './seeds/producto-terminado.seed';
import { seedInsumos } from './seeds/insumo.seed';
import { seedRutas } from './seeds/rutas.seed';
import { seedAccesos } from './seeds/accesos.seed';
import { seedUsuarioPruebaInventario } from './seeds/usuario-prueba-inventario.seed';
import { seedUsuarioPruebaCliente } from './seeds/usuario-prueba-cliente.seed';
import { seedUnidadMedidaKpi } from './seeds/unidad-medida-kpi.seed';
import { seedFrecuenciaMedicion } from './seeds/frecuencia-medicion.seed';
import { seedPeriodo } from './seeds/periodo.seed';
import { seedEstadoIniciativa } from './seeds/estado-iniciativa.seed';
import { seedDemoReembolsos } from './seeds/demo-reembolsos.seed';
import { seedDemoStockProductos } from './seeds/demo-stock-productos.seed';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  await seedRoles(prisma);
  await seedAdmin(prisma);
  await seedEstadoPlanEstrategico(prisma);
  await seedCategorias(prisma);
  await seedPerspectivaBsc(prisma);
  await seedTipoModulo(prisma);
  await seedEstadoObjetivo(prisma);
  await seedUnidadMedidaKpi(prisma);
  await seedFrecuenciaMedicion(prisma);
  await seedPeriodo(prisma);
  await seedEstadoIniciativa(prisma);
  await seedPresentaciones(prisma);
  await seedProductoTerminado(prisma);
  await seedInsumos(prisma);
  await seedRutas(prisma);
  await seedAccesos(prisma);
  await seedUsuarioPruebaInventario(prisma);
  await seedUsuarioPruebaCliente(prisma);
  // Solo con SEED_DEMO=true (desarrollo).
  await seedDemoReembolsos(prisma);
  await seedDemoStockProductos(prisma);
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
