import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, TipoDocumento } from '@prisma/client';
import { isEmail } from 'class-validator';
import { hashPassword } from '../modules/auth/application/utils/password.util';

const ADMIN_DNI = '00000001';

export class BootstrapAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BootstrapAdminError';
  }
}

interface CredencialesAdmin {
  email: string;
  password: string;
}

interface VariablesAdmin {
  databaseUrl?: string;
  email?: string;
  password?: string;
}

function validarCredenciales({ email, password }: CredencialesAdmin): void {
  if (Array.from(email).length > 150 || !isEmail(email)) {
    throw new BootstrapAdminError(
      'ADMIN_EMAIL debe ser un correo válido de hasta 150 caracteres',
    );
  }
  if (
    Array.from(password).length < 12 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    throw new BootstrapAdminError(
      'ADMIN_INITIAL_PASSWORD debe tener al menos 12 caracteres y como máximo 72 bytes',
    );
  }
}

export function validarVariables(
  variables: VariablesAdmin,
): CredencialesAdmin & { databaseUrl: string } {
  if (!variables.databaseUrl?.trim()) {
    throw new BootstrapAdminError('DATABASE_URL es obligatorio');
  }
  if (!variables.email?.trim()) {
    throw new BootstrapAdminError('ADMIN_EMAIL es obligatorio');
  }
  if (!variables.password?.trim()) {
    throw new BootstrapAdminError('ADMIN_INITIAL_PASSWORD es obligatorio');
  }
  const { databaseUrl, email, password } = variables;
  validarCredenciales({ email, password });
  return { databaseUrl, email, password };
}

export async function crearAdmin(
  prisma: PrismaClient,
  credenciales: CredencialesAdmin,
): Promise<'creado' | 'ya-existia'> {
  validarCredenciales(credenciales);
  return prisma.$transaction(async (tx) => {
    const existente = await tx.user.findFirst({
      where: {
        OR: [
          { email: credenciales.email },
          { username: 'admin' },
          { persona: { numero_documento: ADMIN_DNI } },
        ],
      },
      select: { id: true },
    });
    if (existente) return 'ya-existia';

    const rol = await tx.rol.findUnique({ where: { nombre: 'admin' } });
    if (!rol) {
      throw new BootstrapAdminError(
        'El rol admin no existe: corre migrate deploy',
      );
    }

    const contrasena = await hashPassword(credenciales.password);
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
    const user = await tx.user.create({
      data: {
        persona_id: persona.id,
        username: 'admin',
        email: credenciales.email,
        contrasena,
        estado: true,
        email_verificado: true,
        debe_cambiar_contrasena: true,
      },
    });
    await tx.usuarioRol.create({
      data: { user_id: user.id, rol_id: rol.id, estado: true },
    });
    return 'creado';
  });
}

function reportarError(error: unknown, secretos: string[]): void {
  if (error instanceof BootstrapAdminError) {
    console.error(error.message);
    return;
  }
  const nombre =
    error instanceof Error &&
    /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(error.name) &&
    secretos.every((secreto) => !error.name.includes(secreto))
      ? error.name
      : 'Error';
  const codigoError =
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string'
      ? error.code
      : undefined;
  const codigo =
    codigoError &&
    /^[A-Za-z0-9_]{1,64}$/.test(codigoError) &&
    secretos.every((secreto) => !codigoError.includes(secreto))
      ? codigoError
      : undefined;
  console.error(
    'No se pudo crear el admin',
    nombre,
    ...(codigo ? [codigo] : []),
  );
}

export async function main(): Promise<void> {
  let prisma: PrismaClient | undefined;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  const secretos = [email, password].filter((valor): valor is string =>
    Boolean(valor),
  );
  try {
    const variables = validarVariables({
      databaseUrl: process.env.DATABASE_URL,
      email,
      password,
    });
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: variables.databaseUrl }),
    });
    const resultado = await crearAdmin(prisma, variables);
    console.log(resultado === 'creado' ? 'admin creado' : 'admin ya existia');
  } catch (error: unknown) {
    reportarError(error, secretos);
    process.exitCode = 1;
  } finally {
    if (prisma) {
      try {
        await prisma.$disconnect();
      } catch (error: unknown) {
        reportarError(error, secretos);
        process.exitCode = 1;
      }
    }
  }
}

if (require.main === module) {
  void main();
}
