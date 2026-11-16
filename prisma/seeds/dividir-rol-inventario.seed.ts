import { PrismaClient } from '@prisma/client';

// Migración única: "inventario" se divide en "inventario_insumos" e
// "inventario_productos_terminados" (más granular). Quien ya tenía
// "inventario" activo pasa a tener los dos roles nuevos (misma cobertura de
// acceso que ya tenía) y el rol viejo se desactiva. Idempotente: si
// "inventario" ya está inactivo (ya se migró antes), no hace nada.
export async function seedDividirRolInventario(prisma: PrismaClient) {
  const inventario = await prisma.rol.findUnique({
    where: { nombre: 'inventario' },
  });

  if (!inventario || !inventario.estado) {
    return;
  }

  const [insumos, productosTerminados] = await Promise.all([
    prisma.rol.findUniqueOrThrow({ where: { nombre: 'inventario_insumos' } }),
    prisma.rol.findUniqueOrThrow({
      where: { nombre: 'inventario_productos_terminados' },
    }),
  ]);

  const asignaciones = await prisma.usuarioRol.findMany({
    where: { rol_id: inventario.id, estado: true },
    select: { user_id: true },
  });

  for (const { user_id } of asignaciones) {
    for (const rol of [insumos, productosTerminados]) {
      await prisma.usuarioRol.upsert({
        where: { user_id_rol_id: { user_id, rol_id: rol.id } },
        update: { estado: true },
        create: { user_id, rol_id: rol.id, estado: true },
      });
    }
    console.log(
      `Usuario ${user_id}: "inventario" -> "inventario_insumos" + "inventario_productos_terminados"`,
    );
  }

  await prisma.rol.update({
    where: { id: inventario.id },
    data: { estado: false },
  });
  console.log(
    'Rol "inventario" desactivado (dividido en insumos / productos terminados)',
  );
}
