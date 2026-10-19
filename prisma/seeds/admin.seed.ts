import { PrismaClient, TipoDocumento } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Usuario admin de arranque, para poder probar/usar los endpoints protegidos
// por rol admin sin depender de que exista uno ya (huevo y gallina).
const ADMIN_DNI = '00000001';
const ADMIN_PASSWORD = 'admin123'; // cámbiala apenas inicies sesión

export async function seedAdmin(prisma: PrismaClient) {
  const rolAdmin = await prisma.rol.findUnique({ where: { nombre: 'admin' } });
  if (!rolAdmin) {
    throw new Error('El rol "admin" no existe — corre primero seedRoles');
  }

  const contrasenaHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await prisma.$transaction(async (tx) => {
    const persona = await tx.persona.upsert({
      where: { numero_documento: ADMIN_DNI },
      update: {},
      create: {
        nombres: 'Admin',
        apellido_paterno: 'Sistema',
        apellido_materno: "Franco's",
        tipo_documento: TipoDocumento.dni,
        numero_documento: ADMIN_DNI,
        estado: true,
      },
    });

    const user = await tx.user.upsert({
      where: { persona_id: persona.id },
      update: {},
      create: {
        persona_id: persona.id,
        email: 'admin@francos.test',
        username: 'admin',
        contrasena: contrasenaHash,
        estado: true,
        email_verificado: true,
        debe_cambiar_contrasena: true,
      },
    });

    await tx.usuarioRol.upsert({
      where: { user_id_rol_id: { user_id: user.id, rol_id: rolAdmin.id } },
      update: {},
      create: { user_id: user.id, rol_id: rolAdmin.id, estado: true },
    });
  });

  console.log(
    `Usuario admin listo (usuario: "admin" / contraseña: "${ADMIN_PASSWORD}" — cámbiala de inmediato)`,
  );
}
