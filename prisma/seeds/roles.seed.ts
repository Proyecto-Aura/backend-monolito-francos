import { PrismaClient } from '@prisma/client';

// La descripción se muestra en Configuración > Roles y permisos.
const ROLES_BASE = [
  { nombre: 'admin', descripcion: 'Acceso total al sistema' },
  { nombre: 'ventas', descripcion: 'Gestión de ventas, clientes y catálogo' },
  { nombre: 'cliente', descripcion: 'Cuenta del portal del cliente' },
  { nombre: 'inventario', descripcion: 'Control de stock e insumos' },
  { nombre: 'produccion', descripcion: 'Órdenes y solicitudes de producción' },
  {
    nombre: 'estrategico',
    descripcion:
      'Planeamiento y seguimiento estratégico (BSC, KPIs, objetivos, iniciativas)',
  },
  { nombre: 'despacho', descripcion: 'Preparación y entrega de pedidos' },
];

export async function seedRoles(prisma: PrismaClient) {
  for (const { nombre, descripcion } of ROLES_BASE) {
    await prisma.rol.upsert({
      where: { nombre },
      update: {},
      create: { nombre, descripcion, estado: true },
    });
    // Igual que la migración: no pisa una descripción ya escrita.
    await prisma.rol.updateMany({
      where: { nombre, descripcion: null },
      data: { descripcion },
    });
    console.log(`Rol "${nombre}" listo`);
  }
}
