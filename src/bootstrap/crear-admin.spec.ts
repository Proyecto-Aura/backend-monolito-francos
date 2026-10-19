jest.mock('@prisma/client', () => {
  const original =
    jest.requireActual<typeof import('@prisma/client')>('@prisma/client');
  return { ...original, PrismaClient: jest.fn() };
});
jest.mock('@prisma/adapter-pg');

import { Prisma, PrismaClient, TipoDocumento } from '@prisma/client';
import { comparePassword } from '../modules/auth/application/utils/password.util';
import { crearAdmin, main, validarVariables } from './crear-admin';

describe('crearAdmin', () => {
  const correo = 'admin@ejemplo.test';
  const contrasenaInicial = 'x'.repeat(16);
  const findFirst = jest.fn();
  const findUnique = jest.fn();
  const upsert = jest.fn();
  const crearUsuario = jest.fn();
  const crearUsuarioRol = jest.fn();
  const desconectar = jest.fn();
  const tx = {
    user: { findFirst, create: crearUsuario },
    rol: { findUnique },
    persona: { upsert },
    usuarioRol: { create: crearUsuarioRol },
  };
  const transaction = jest.fn(
    (callback: (cliente: Prisma.TransactionClient) => Promise<unknown>) =>
      callback(tx as unknown as Prisma.TransactionClient),
  );
  const prisma = {
    $transaction: transaction,
    $disconnect: desconectar,
  } as unknown as PrismaClient;
  const credenciales = { email: correo, password: contrasenaInicial };

  beforeEach(() => {
    jest.clearAllMocks();
    findFirst.mockResolvedValue(null);
    findUnique.mockResolvedValue({ id: 7, nombre: 'admin' });
    upsert.mockResolvedValue({ id: 'persona-1' });
    crearUsuario.mockResolvedValue({ id: 'user-1' });
    crearUsuarioRol.mockResolvedValue({ id: 1 });
    desconectar.mockResolvedValue(undefined);
    jest.mocked(PrismaClient).mockImplementation(() => prisma);
  });

  it('crea persona, usuario y rol en una transacción con bcrypt', async () => {
    await expect(crearAdmin(prisma, credenciales)).resolves.toBe('creado');

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith({
      where: { numero_documento: '00000001' },
      update: {},
      create: {
        nombres: 'Admin',
        apellido_paterno: 'Sistema',
        apellido_materno: "Franco's",
        tipo_documento: TipoDocumento.dni,
        numero_documento: '00000001',
        estado: true,
      },
    });
    const [argumento] = crearUsuario.mock.calls[0] as [
      { data: { contrasena: string } },
    ];
    expect(argumento.data).toMatchObject({
      persona_id: 'persona-1',
      username: 'admin',
      email: correo,
      estado: true,
      email_verificado: true,
      debe_cambiar_contrasena: true,
    });
    expect(argumento.data.contrasena).not.toBe(contrasenaInicial);
    await expect(
      comparePassword(contrasenaInicial, argumento.data.contrasena),
    ).resolves.toBe(true);
    expect(crearUsuarioRol).toHaveBeenCalledWith({
      data: { user_id: 'user-1', rol_id: 7, estado: true },
    });
  });

  it.each([
    ['email', { email: correo }],
    ['username', { username: 'admin' }],
    ['documento de la persona', { persona: { numero_documento: '00000001' } }],
  ])('no modifica datos si ya existe un usuario por %s', async (_, filtro) => {
    findFirst.mockResolvedValue({ id: 'existente' });
    await expect(crearAdmin(prisma, credenciales)).resolves.toBe('ya-existia');
    const [consulta] = findFirst.mock.calls[0] as [
      { where: { OR: Prisma.UserWhereInput[] }; select: { id: boolean } },
    ];
    expect(consulta.where.OR).toContainEqual(filtro);
    expect(consulta.select).toEqual({ id: true });
    expect(findUnique).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
    expect(crearUsuario).not.toHaveBeenCalled();
    expect(crearUsuarioRol).not.toHaveBeenCalled();
  });

  it('reutiliza una persona existente sin usuario', async () => {
    upsert.mockResolvedValue({ id: 'persona-existente' });
    await crearAdmin(prisma, credenciales);
    const [argumento] = crearUsuario.mock.calls[0] as [
      { data: { persona_id: string } },
    ];
    expect(argumento.data.persona_id).toBe('persona-existente');
  });

  it('falla sin crear datos si falta el rol admin', async () => {
    findUnique.mockResolvedValue(null);
    await expect(crearAdmin(prisma, credenciales)).rejects.toThrow(
      'El rol admin no existe: corre migrate deploy',
    );
    expect(upsert).not.toHaveBeenCalled();
    expect(crearUsuario).not.toHaveBeenCalled();
    expect(crearUsuarioRol).not.toHaveBeenCalled();
  });

  it.each([
    ['contraseña corta', { password: 'x'.repeat(11) }],
    ['contraseña de más de 72 bytes', { password: 'á'.repeat(37) }],
    ['correo inválido', { email: 'correo-invalido' }],
    ['correo largo', { email: `${'a'.repeat(150)}@ejemplo.test` }],
  ])('rechaza %s sin incluir los valores', async (_, cambio) => {
    const datos = { ...credenciales, ...cambio };
    const error = await crearAdmin(prisma, datos).catch(
      (causa: unknown) => causa,
    );
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain(datos.email);
    expect((error as Error).message).not.toContain(datos.password);
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each(['databaseUrl', 'email', 'password'] as const)(
    'rechaza %s ausente o vacío sin incluir valores',
    (campo) => {
      for (const valor of [undefined, '']) {
        const datos = {
          databaseUrl: 'postgresql://localhost/prueba',
          ...credenciales,
          [campo]: valor,
        };
        try {
          validarVariables(datos);
          throw new Error('La validación debía fallar');
        } catch (error: unknown) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('obligatorio');
          expect((error as Error).message).not.toContain(correo);
          expect((error as Error).message).not.toContain(contrasenaInicial);
        }
      }
    },
  );

  describe('main', () => {
    let log: jest.SpiedFunction<typeof console.log>;
    let error: jest.SpiedFunction<typeof console.error>;
    let envAnterior: NodeJS.ProcessEnv;
    let salidaAnterior: string | number | undefined;

    beforeEach(() => {
      envAnterior = process.env;
      process.env = {
        ...envAnterior,
        DATABASE_URL: 'postgresql://localhost/prueba',
        ADMIN_EMAIL: correo,
        ADMIN_INITIAL_PASSWORD: contrasenaInicial,
      };
      salidaAnterior = process.exitCode;
      log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
      process.env = envAnterior;
      process.exitCode = salidaAnterior;
      log.mockRestore();
      error.mockRestore();
    });

    it('no registra credenciales al crear el admin', async () => {
      await main();
      expect(log).toHaveBeenCalledWith('admin creado');
      expect(error).not.toHaveBeenCalled();
      expect(desconectar).toHaveBeenCalledTimes(1);
      const salida = JSON.stringify([...log.mock.calls, ...error.mock.calls]);
      expect(salida).not.toContain(correo);
      expect(salida).not.toContain(contrasenaInicial);
    });

    it('no registra datos del error desconocido y desconecta', async () => {
      const hash = '$2b$' + 'z'.repeat(56);
      const causa = Object.assign(
        new Error(`${correo} ${contrasenaInicial} ${hash}`),
        {
          name: 'PrismaClientKnownRequestError',
          code: 'P2002',
        },
      );
      crearUsuario.mockRejectedValue(causa);
      await main();
      expect(error).toHaveBeenCalledWith(
        'No se pudo crear el admin',
        'PrismaClientKnownRequestError',
        'P2002',
      );
      expect(process.exitCode).toBe(1);
      expect(desconectar).toHaveBeenCalledTimes(1);
      const salida = JSON.stringify([...log.mock.calls, ...error.mock.calls]);
      expect(salida).not.toContain(correo);
      expect(salida).not.toContain(contrasenaInicial);
      expect(salida).not.toContain(hash);
    });

    it('descarta nombre o código de error que contenga la contraseña', async () => {
      const causa = Object.assign(new Error('fallo'), {
        name: contrasenaInicial,
        code: contrasenaInicial,
      });
      crearUsuario.mockRejectedValue(causa);
      await main();
      expect(error).toHaveBeenCalledWith('No se pudo crear el admin', 'Error');
      expect(JSON.stringify(error.mock.calls)).not.toContain(contrasenaInicial);
      expect(desconectar).toHaveBeenCalledTimes(1);
    });

    it('informa que ya existía sin escribir ni registrar credenciales', async () => {
      findFirst.mockResolvedValue({ id: 'existente' });
      await main();
      expect(log).toHaveBeenCalledWith('admin ya existia');
      expect(crearUsuario).not.toHaveBeenCalled();
      expect(upsert).not.toHaveBeenCalled();
      expect(desconectar).toHaveBeenCalledTimes(1);
      const salida = JSON.stringify([...log.mock.calls, ...error.mock.calls]);
      expect(salida).not.toContain(correo);
      expect(salida).not.toContain(contrasenaInicial);
    });

    it('valida el entorno antes de construir Prisma', async () => {
      delete process.env.ADMIN_EMAIL;
      await main();
      expect(PrismaClient).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledWith('ADMIN_EMAIL es obligatorio');
      expect(process.exitCode).toBe(1);
    });
  });
});
