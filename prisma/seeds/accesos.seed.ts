import { PrismaClient } from '@prisma/client';

const RUTAS_ESTRATEGICO = [
  'plan-estrategico',
  'objetivos-estrategicos',
  'mapa-estrategico',
  'gestionar-kpis',
  'gestionar-iniciativas',
  'tablero-control',
  'analisis-estrategico',
  'gestion-estrategica-ti',
  'objetivos-estrategicos-ti',
  'mapa-estrategico-ti',
  'gestionar-kpis-ti',
  'gestionar-iniciativas-ti',
  'tablero-control-ti',
  'analisis-estrategico-ti',
];

// El rol despacho solo ve su pantalla (HU-A-023). El padre (despacho-pedidos)
// se muestra solo porque el árbol del menú incluye los ancestros de cada
// ruta permitida (ver GetMiMenuUseCase), no hace falta darle acceso aparte.
const RUTAS_DESPACHO = ['gestion-despachos'];

// Inventario dividido en insumos y productos terminados: cada uno ve solo
// las pantallas hoja de su rama (los nodos "inventario"/"insumos"/
// "productos-terminados" se muestran solo por ser ancestros).
const RUTAS_INVENTARIO_INSUMOS = ['stock-insumos', 'solicitudes-insumos'];
const RUTAS_INVENTARIO_PRODUCTOS_TERMINADOS = [
  'stock-productos',
  'pedidos-por-preparar',
  'solicitudes-produccion',
];

export async function seedAccesos(prisma: PrismaClient) {
  const admin = await prisma.rol.findUnique({ where: { nombre: 'admin' } });

  if (!admin) {
    console.log('Rol "admin" no existe todavia, se omite el seed de accesos');
    return;
  }

  const rutas = await prisma.ruta.findMany({
    select: { id: true, nombre: true },
  });

  for (const ruta of rutas) {
    await prisma.acceso.upsert({
      where: {
        rol_id_ruta_id: { rol_id: admin.id, ruta_id: ruta.id },
      },
      update: { estado: true },
      create: { rol_id: admin.id, ruta_id: ruta.id, estado: true },
    });
    console.log(`Acceso: admin -> "${ruta.nombre}" listo`);
  }

  const despacho = await prisma.rol.findUnique({
    where: { nombre: 'despacho' },
  });
  if (despacho) {
    const rutasDespacho = await prisma.ruta.findMany({
      where: { nombre: { in: RUTAS_DESPACHO } },
      select: { id: true, nombre: true },
    });
    for (const ruta of rutasDespacho) {
      await prisma.acceso.upsert({
        where: { rol_id_ruta_id: { rol_id: despacho.id, ruta_id: ruta.id } },
        update: { estado: true },
        create: { rol_id: despacho.id, ruta_id: ruta.id, estado: true },
      });
      console.log(`Acceso: despacho -> "${ruta.nombre}" listo`);
    }
  }

  const inventarioInsumos = await prisma.rol.findUnique({
    where: { nombre: 'inventario_insumos' },
  });
  if (inventarioInsumos) {
    const rutasInsumos = await prisma.ruta.findMany({
      where: { nombre: { in: RUTAS_INVENTARIO_INSUMOS } },
      select: { id: true, nombre: true },
    });
    for (const ruta of rutasInsumos) {
      await prisma.acceso.upsert({
        where: {
          rol_id_ruta_id: { rol_id: inventarioInsumos.id, ruta_id: ruta.id },
        },
        update: { estado: true },
        create: {
          rol_id: inventarioInsumos.id,
          ruta_id: ruta.id,
          estado: true,
        },
      });
      console.log(`Acceso: inventario_insumos -> "${ruta.nombre}" listo`);
    }
  }

  const inventarioProductosTerminados = await prisma.rol.findUnique({
    where: { nombre: 'inventario_productos_terminados' },
  });
  if (inventarioProductosTerminados) {
    const rutasProductosTerminados = await prisma.ruta.findMany({
      where: { nombre: { in: RUTAS_INVENTARIO_PRODUCTOS_TERMINADOS } },
      select: { id: true, nombre: true },
    });
    for (const ruta of rutasProductosTerminados) {
      await prisma.acceso.upsert({
        where: {
          rol_id_ruta_id: {
            rol_id: inventarioProductosTerminados.id,
            ruta_id: ruta.id,
          },
        },
        update: { estado: true },
        create: {
          rol_id: inventarioProductosTerminados.id,
          ruta_id: ruta.id,
          estado: true,
        },
      });
      console.log(
        `Acceso: inventario_productos_terminados -> "${ruta.nombre}" listo`,
      );
    }
  }

  const estrategico = await prisma.rol.findUnique({
    where: { nombre: 'estrategico' },
  });

  if (!estrategico) {
    console.log(
      'Rol "estrategico" no existe todavia, se omite su seed de accesos',
    );
    return;
  }

  const rutasEstrategico = await prisma.ruta.findMany({
    where: { nombre: { in: RUTAS_ESTRATEGICO } },
    select: { id: true, nombre: true },
  });

  for (const ruta of rutasEstrategico) {
    await prisma.acceso.upsert({
      where: {
        rol_id_ruta_id: { rol_id: estrategico.id, ruta_id: ruta.id },
      },
      update: { estado: true },
      create: { rol_id: estrategico.id, ruta_id: ruta.id, estado: true },
    });
    console.log(`Acceso: estrategico -> "${ruta.nombre}" listo`);
  }
}
