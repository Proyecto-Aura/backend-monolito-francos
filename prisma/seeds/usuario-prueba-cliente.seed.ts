import {
  CategoriaCliente,
  PrismaClient,
  TipoCliente,
  TipoDocumento,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Usuario de prueba con rol "cliente", para iniciar sesión en el portal del
// cliente (HU-B-001). Tiene su registro en `cliente`, como uno que se registró.
const USUARIO_DNI = '00000003';
const USUARIO_PASSWORD = 'cliente123';
const USUARIO_USERNAME = 'cliente_prueba';
const USUARIO_EMAIL = 'cliente.prueba@francos.test';

export async function seedUsuarioPruebaCliente(prisma: PrismaClient) {
  const rolCliente = await prisma.rol.findUnique({
    where: { nombre: 'cliente' },
  });

  if (!rolCliente) {
    console.log(
      'Rol "cliente" no existe todavia, se omite el usuario de prueba',
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
        apellido_paterno: 'Cliente',
        apellido_materno: 'Portal',
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
        email: USUARIO_EMAIL,
        username: USUARIO_USERNAME,
        contrasena: contrasenaHash,
        estado: true,
        email_verificado: true,
        debe_cambiar_contrasena: false,
      },
    });

    await tx.usuarioRol.upsert({
      where: {
        user_id_rol_id: { user_id: user.id, rol_id: rolCliente.id },
      },
      update: {},
      create: { user_id: user.id, rol_id: rolCliente.id, estado: true },
    });

    await tx.cliente.upsert({
      where: { persona_id: persona.id },
      update: {},
      create: {
        persona_id: persona.id,
        tipo_cliente: TipoCliente.persona_natural,
        categoria_cliente: CategoriaCliente.minorista,
      },
    });

    return user.id;
  });

  console.log(
    `Cliente de prueba listo (usuario: "${USUARIO_USERNAME}" o "${USUARIO_EMAIL}" / contraseña: "${USUARIO_PASSWORD}") — user_id: ${userId}`,
  );
}
