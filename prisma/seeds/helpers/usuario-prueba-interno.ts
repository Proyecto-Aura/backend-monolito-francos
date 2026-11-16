import { PrismaClient, TipoDocumento } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Usuario interno de prueba con un único rol y acceso solo a las rutas
// indicadas, para probar que GET /rutas/mi-menu filtra bien por rol.
export interface UsuarioPruebaInterno {
  dni: string;
  username: string;
  password: string;
  email: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  rol: string;
  rutasPermitidas: string[];
}

export async function seedUsuarioPruebaInterno(
  prisma: PrismaClient,
  config: UsuarioPruebaInterno,
) {
  const rol = await prisma.rol.findUnique({ where: { nombre: config.rol } });

  if (!rol) {
    console.log(
      `Rol "${config.rol}" no existe todavia, se omite el usuario de prueba`,
    );
    return;
  }

  const contrasenaHash = await bcrypt.hash(config.password, 10);

  const userId = await prisma.$transaction(async (tx) => {
    const persona = await tx.persona.upsert({
      where: { numero_documento: config.dni },
      update: {},
      create: {
        nombres: 'Prueba',
        apellido_paterno: config.apellidoPaterno,
        apellido_materno: config.apellidoMaterno,
        tipo_documento: TipoDocumento.dni,
        numero_documento: config.dni,
        estado: true,
      },
    });

    const user = await tx.user.upsert({
      where: { persona_id: persona.id },
      update: {},
      create: {
        persona_id: persona.id,
        email: config.email,
        username: config.username,
        contrasena: contrasenaHash,
        estado: true,
        email_verificado: true,
        debe_cambiar_contrasena: false,
      },
    });

    await tx.usuarioRol.upsert({
      where: { user_id_rol_id: { user_id: user.id, rol_id: rol.id } },
      update: {},
      create: { user_id: user.id, rol_id: rol.id, estado: true },
    });

    return user.id;
  });

  for (const nombreRuta of config.rutasPermitidas) {
    const ruta = await prisma.ruta.findUnique({
      where: { nombre: nombreRuta },
    });

    if (!ruta) {
      console.log(`Ruta "${nombreRuta}" no existe todavia, se omite`);
      continue;
    }

    await prisma.acceso.upsert({
      where: { rol_id_ruta_id: { rol_id: rol.id, ruta_id: ruta.id } },
      update: { estado: true },
      create: { rol_id: rol.id, ruta_id: ruta.id, estado: true },
    });
    console.log(`Acceso: ${config.rol} -> "${nombreRuta}" listo`);
  }

  console.log(
    `Usuario de prueba listo (usuario: "${config.username}" / contraseña: "${config.password}") — user_id: ${userId}`,
  );
}
