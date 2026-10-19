import { PrismaClient, TipoDocumento } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Usuario de prueba con rol "inventario", con acceso SOLO a la rama de
// "insumos" (y sus hijas), nada de "productos-terminados" -- para probar
// que GET /rutas/mi-menu filtra bien por rol.
const USUARIO_DNI = '00000002';
const USUARIO_PASSWORD = 'inventario123';
const USUARIO_USERNAME = 'inventario_insumos';

// Rutas a las que SI se le da acceso (no se incluye "inventario", el nodo
// raiz, a proposito: deberia aparecer solo por ser ancestro de "insumos").
const RUTAS_PERMITIDAS = ['insumos', 'stock-insumos', 'solicitudes-insumos'];

export async function seedUsuarioPruebaInventario(prisma: PrismaClient) {
  const rolInventario = await prisma.rol.findUnique({
    where: { nombre: 'inventario' },
  });

  if (!rolInventario) {
    console.log(
      'Rol "inventario" no existe todavia, se omite el usuario de prueba',
    );
    return;
  }

  const contrasenaHash = await bcrypt.hash(USUARIO_PASSWORD, 10);

  const userId = await prisma.$transaction(async (tx) => {
    const persona = await tx.persona.upsert({
      where: { numero_documento: USUARIO_DNI },
      update: {},
      create: {
        nombres: 'Prueba',
        apellido_paterno: 'Inventario',
        apellido_materno: 'Insumos',
        tipo_documento: TipoDocumento.dni,
        numero_documento: USUARIO_DNI,
        estado: true,
      },
    });

    const user = await tx.user.upsert({
      where: { persona_id: persona.id },
      update: {},
      create: {
        persona_id: persona.id,
        email: 'inventario.insumos@francos.test',
        username: USUARIO_USERNAME,
        contrasena: contrasenaHash,
        estado: true,
        email_verificado: true,
        debe_cambiar_contrasena: false,
      },
    });

    await tx.usuarioRol.upsert({
      where: {
        user_id_rol_id: { user_id: user.id, rol_id: rolInventario.id },
      },
      update: {},
      create: { user_id: user.id, rol_id: rolInventario.id, estado: true },
    });

    return user.id;
  });

  for (const nombreRuta of RUTAS_PERMITIDAS) {
    const ruta = await prisma.ruta.findUnique({ where: { nombre: nombreRuta } });

    if (!ruta) {
      console.log(`Ruta "${nombreRuta}" no existe todavia, se omite`);
      continue;
    }

    await prisma.acceso.upsert({
      where: {
        rol_id_ruta_id: { rol_id: rolInventario.id, ruta_id: ruta.id },
      },
      update: { estado: true },
      create: { rol_id: rolInventario.id, ruta_id: ruta.id, estado: true },
    });
    console.log(`Acceso: inventario -> "${nombreRuta}" listo`);
  }

  console.log(
    `Usuario de prueba listo (usuario: "${USUARIO_USERNAME}" / contraseña: "${USUARIO_PASSWORD}") — user_id: ${userId}`,
  );
}
