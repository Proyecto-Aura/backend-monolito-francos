import { PrismaClient } from '@prisma/client';

export async function seedAccesos(prisma: PrismaClient) {
  const admin = await prisma.rol.findUnique({ where: { nombre: 'admin' } });

  if (!admin) {
    console.log('Rol "admin" no existe todavia, se omite el seed de accesos');
    return;
  }

  const rutas = await prisma.ruta.findMany({ select: { id: true, nombre: true } });

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
}
