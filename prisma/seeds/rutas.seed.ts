import { PrismaClient } from '@prisma/client';

interface RutaSeed {
  nombre: string;
  etiqueta: string;
  icono: string;
  descripcion?: string;
  parent?: string;
}

const RUTAS_BASE: RutaSeed[] = [
  // --- Inventario ---
  {
    nombre: 'inventario',
    etiqueta: 'Inventario',
    icono: 'package',
    descripcion: 'Control de stock y productos',
  },
  {
    nombre: 'insumos',
    etiqueta: 'Insumos',
    icono: 'box',
    parent: 'inventario',
  },
  {
    nombre: 'stock-insumos',
    etiqueta: 'Stock de insumos',
    icono: 'boxes',
    parent: 'insumos',
  },
  {
    nombre: 'solicitudes-insumos',
    etiqueta: 'Solicitudes de insumos',
    icono: 'clipboard-list',
    parent: 'insumos',
  },
  {
    nombre: 'productos-terminados',
    etiqueta: 'Productos terminados',
    icono: 'recycle',
    parent: 'inventario',
  },
  {
    nombre: 'stock-productos',
    etiqueta: 'Stock de productos',
    icono: 'boxes',
    parent: 'productos-terminados',
  },
  {
    nombre: 'pedidos-por-preparar',
    etiqueta: 'Pedidos por preparar',
    icono: 'shopping-cart',
    parent: 'productos-terminados',
  },
  {
    nombre: 'solicitudes-produccion',
    etiqueta: 'Solicitudes a producción',
    icono: 'clipboard-list',
    parent: 'productos-terminados',
  },

  // --- Ventas ---
  {
    nombre: 'ventas',
    etiqueta: 'Ventas',
    icono: 'store',
    descripcion: 'Gestión de ventas y pedidos',
  },
  {
    nombre: 'clientes',
    etiqueta: 'Clientes',
    icono: 'users',
    parent: 'ventas',
  },
  {
    nombre: 'catalogo',
    etiqueta: 'Catálogo',
    icono: 'package',
    parent: 'ventas',
  },
  {
    nombre: 'gestion-productos',
    etiqueta: 'Gestión de productos',
    icono: 'list',
    parent: 'catalogo',
  },
  {
    nombre: 'configuracion-catalogo',
    etiqueta: 'Configuración del catálogo',
    icono: 'settings',
    parent: 'catalogo',
  },
  {
    nombre: 'mis-pedidos',
    etiqueta: 'Mis pedidos',
    icono: 'shopping-cart',
    parent: 'ventas',
  },
  {
    nombre: 'gestion-pedidos',
    etiqueta: 'Gestión de pedidos',
    icono: 'clipboard-list',
    parent: 'mis-pedidos',
  },
  {
    nombre: 'reembolsos',
    etiqueta: 'Reembolsos',
    icono: 'rotate-ccw',
    parent: 'mis-pedidos',
  },

  // --- Gestión Estratégica ---
  {
    nombre: 'estrategico',
    etiqueta: 'Gestión Estratégica',
    icono: 'compass',
    descripcion: 'Planeamiento y seguimiento estratégico',
  },
  {
    nombre: 'plan-estrategico',
    etiqueta: 'Plan estratégico',
    icono: 'target',
    parent: 'estrategico',
  },
  {
    nombre: 'gestion-estrategica-negocio',
    etiqueta: 'Gestión estratégica de negocio',
    icono: 'building-2',
    parent: 'estrategico',
  },
  {
    nombre: 'objetivos-estrategicos',
    etiqueta: 'Gestión de objetivos estratégicos',
    icono: 'flag',
    parent: 'gestion-estrategica-negocio',
  },
  {
    nombre: 'mapa-estrategico',
    etiqueta: 'Mapa estratégico',
    icono: 'map',
    parent: 'gestion-estrategica-negocio',
  },
  {
    nombre: 'gestionar-kpis',
    etiqueta: 'Gestionar KPIs',
    icono: 'bar-chart-3',
    parent: 'gestion-estrategica-negocio',
  },
  {
    nombre: 'gestionar-iniciativas',
    etiqueta: 'Gestionar iniciativas',
    icono: 'rocket',
    parent: 'gestion-estrategica-negocio',
  },
  {
    nombre: 'tablero-control',
    etiqueta: 'Tablero de control',
    icono: 'layout-dashboard',
    parent: 'gestion-estrategica-negocio',
  },
  {
    nombre: 'analisis-estrategico',
    etiqueta: 'Análisis estratégico',
    icono: 'folder-open',
    parent: 'gestion-estrategica-negocio',
  },
  {
    nombre: 'gestion-estrategica-ti',
    etiqueta: 'Gestión estratégica de TI',
    icono: 'monitor',
    parent: 'estrategico',
  },
  {
    nombre: 'objetivos-estrategicos-ti',
    etiqueta: 'Gestión de objetivos estratégicos de TI',
    icono: 'flag',
    parent: 'gestion-estrategica-ti',
  },
  {
    nombre: 'mapa-estrategico-ti',
    etiqueta: 'Mapa estratégico de TI',
    icono: 'map',
    parent: 'gestion-estrategica-ti',
  },
  {
    nombre: 'gestionar-kpis-ti',
    etiqueta: 'Gestionar KPIs de TI',
    icono: 'bar-chart-3',
    parent: 'gestion-estrategica-ti',
  },
  {
    nombre: 'gestionar-iniciativas-ti',
    etiqueta: 'Gestionar iniciativas de TI',
    icono: 'rocket',
    parent: 'gestion-estrategica-ti',
  },
  {
    nombre: 'tablero-control-ti',
    etiqueta: 'Tablero de control de TI',
    icono: 'layout-dashboard',
    parent: 'gestion-estrategica-ti',
  },
  {
    nombre: 'analisis-estrategico-ti',
    etiqueta: 'Análisis estratégico de TI',
    icono: 'folder-open',
    parent: 'gestion-estrategica-ti',
  },
  // --- Configuración ---
  {
    nombre: 'configuracion',
    etiqueta: 'Configuración',
    icono: 'settings',
    descripcion: 'Datos de la empresa, usuarios y permisos',
  },
  {
    nombre: 'empresa',
    etiqueta: 'Datos de la empresa',
    icono: 'building-2',
    parent: 'configuracion',
  },
  {
    nombre: 'usuarios',
    etiqueta: 'Usuarios internos',
    icono: 'users',
    parent: 'configuracion',
  },
  {
    nombre: 'comprobantes',
    etiqueta: 'Series de comprobantes',
    icono: 'receipt',
    parent: 'configuracion',
  },
];

export async function seedRutas(prisma: PrismaClient) {
  const ids = new Map<string, number>();

  for (const ruta of RUTAS_BASE) {
    const parent_id = ruta.parent ? (ids.get(ruta.parent) ?? null) : null;

    const creada = await prisma.ruta.upsert({
      where: { nombre: ruta.nombre },
      update: {
        etiqueta: ruta.etiqueta,
        icono: ruta.icono,
        descripcion: ruta.descripcion ?? null,
        parent_id,
      },
      create: {
        nombre: ruta.nombre,
        etiqueta: ruta.etiqueta,
        icono: ruta.icono,
        descripcion: ruta.descripcion ?? null,
        estado: true,
        parent_id,
      },
    });

    ids.set(ruta.nombre, creada.id);
    console.log(`Ruta "${ruta.nombre}" lista`);
  }
}
