import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  CanalNotificacion,
  PlantillaNotificacion,
  Prisma,
} from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { envs } from '../src/config/envs';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { S3Service } from '../src/infrastructure/storage/s3.service';
import { hashPassword } from '../src/modules/auth/application/utils/password.util';
import { FakeS3Service } from './fake-s3.service';

const URL = '/api/v1/parametros-notificaciones';
const SMTP_ESPERADO = {
  remitente: envs.smtpFrom,
  servidor_smtp: envs.smtpHost,
  seguridad: envs.smtpSecure ? 'TLS' : 'STARTTLS',
};
const ROLES = [
  'ventas',
  'inventario',
  'produccion',
  'despacho',
  'estrategico',
  'cliente',
] as const;
const CLAVES = [
  'verificacion_email',
  'bienvenida_cliente',
  'credenciales_usuario_interno',
  'recuperar_contrasena',
  'comprobante_emitido',
  'pago_confirmado',
  'pago_rechazado',
  'pedido_en_camino',
  'reembolso_aprobado',
  'reembolso_rechazado',
  'reembolso_procesado',
] as const;
const RUTAS = [
  { metodo: 'get' as const, ruta: '/canales' },
  { metodo: 'patch' as const, ruta: '/canales/email' },
  { metodo: 'get' as const, ruta: '/plantillas' },
  { metodo: 'get' as const, ruta: '/plantillas/verificacion_email' },
  { metodo: 'patch' as const, ruta: '/plantillas/verificacion_email' },
];
interface CanalHttp {
  tipo: 'email' | 'portal';
  activo: boolean;
  remitente: string | null;
  servidor_smtp: string | null;
  seguridad: string | null;
  destinatarios: string | null;
  updated_at: string;
}
interface PlantillaHttp {
  clave: string;
  nombre: string;
  destinatario: string;
  variables: string[];
  asunto: string;
  cuerpo: string;
  updated_at: string;
}

describe('Parametros de notificaciones OFT0-285 (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminId: string;
  let adminToken: string;
  let sesionesAdminPrevias: string[];
  let canalesOriginales: CanalNotificacion[];
  let plantillasOriginales: PlantillaNotificacion[];
  const tokens = {} as Record<(typeof ROLES)[number], string>;
  const usuarios: string[] = [];
  const personas: string[] = [];
  const http = () => request(app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${adminToken}` });
  const login = async (identificador: string, password: string) => {
    const response = await http()
      .post('/api/v1/auth/login')
      .send({ identificador, password })
      .expect(201);
    return (response.body as { access_token: string }).access_token;
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(S3Service)
      .useValue(new FakeS3Service())
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    canalesOriginales = await prisma.canalNotificacion.findMany();
    plantillasOriginales = await prisma.plantillaNotificacion.findMany();
    adminId = (
      await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } })
    ).id;
    sesionesAdminPrevias = (
      await prisma.refreshToken.findMany({
        where: { user_id: adminId },
        select: { id: true },
      })
    ).map((sesion) => sesion.id);
    adminToken = await login('admin', 'admin123');
    const contrasena = 'Prueba285';
    const hash = await hashPassword(contrasena);
    for (const [indice, nombre] of ROLES.entries()) {
      const rol = await prisma.rol.findUniqueOrThrow({ where: { nombre } });
      const persona = await prisma.persona.create({
        data: {
          nombres: 'E2E285',
          apellido_paterno: 'Notificaciones',
          apellido_materno: nombre,
          tipo_documento: 'dni',
          numero_documento: String(99285000 + indice),
        },
      });
      personas.push(persona.id);
      const user = await prisma.user.create({
        data: {
          persona_id: persona.id,
          username: `e2e285-${nombre}`,
          email: `e2e285-${nombre}@francos.test`,
          contrasena: hash,
          estado: true,
          email_verificado: true,
        },
      });
      usuarios.push(user.id);
      await prisma.usuarioRol.create({
        data: { user_id: user.id, rol_id: rol.id },
      });
      tokens[nombre] = await login(user.username, contrasena);
    }
  }, 45000);

  afterAll(async () => {
    for (const canal of canalesOriginales) {
      await prisma.canalNotificacion.upsert({
        where: { tipo: canal.tipo },
        create: canal,
        update: canal,
      });
    }
    for (const plantilla of plantillasOriginales) {
      const data = {
        ...plantilla,
        variables: plantilla.variables as Prisma.InputJsonValue,
      };
      await prisma.plantillaNotificacion.upsert({
        where: { clave: plantilla.clave },
        create: data,
        update: data,
      });
    }
    await prisma.refreshToken.deleteMany({
      where: { user_id: { in: usuarios } },
    });
    await prisma.usuarioRol.deleteMany({
      where: { user_id: { in: usuarios } },
    });
    await prisma.user.deleteMany({ where: { id: { in: usuarios } } });
    await prisma.persona.deleteMany({ where: { id: { in: personas } } });
    await prisma.refreshToken.deleteMany({
      where: { user_id: adminId, id: { notIn: sesionesAdminPrevias } },
    });
    await app.close();
  });

  it.each(RUTAS)(
    '$metodo $ruta sin token devuelve 401',
    async ({ metodo, ruta }) => {
      await http()[metodo](`${URL}${ruta}`).send({}).expect(401);
    },
  );
  it.each(ROLES)('el rol %s recibe 403 en los cinco endpoints', async (rol) => {
    for (const { metodo, ruta } of RUTAS) {
      await http()
        [metodo](`${URL}${ruta}`)
        .set('Authorization', `Bearer ${tokens[rol]}`)
        .send({})
        .expect(403);
    }
  });

  it('admin obtiene los dos canales con sus campos publicos exactos', async () => {
    const response = await http().get(`${URL}/canales`).set(auth()).expect(200);
    const canales = response.body as CanalHttp[];
    expect(canales.map((canal) => canal.tipo).sort()).toEqual([
      'email',
      'portal',
    ]);
    for (const canal of canales) {
      expect(Object.keys(canal).sort()).toEqual(
        [
          'tipo',
          'activo',
          'remitente',
          'servidor_smtp',
          'seguridad',
          'destinatarios',
          'updated_at',
        ].sort(),
      );
      expect(typeof canal.activo).toBe('boolean');
      expect(Number.isNaN(Date.parse(canal.updated_at))).toBe(false);
      expect(canal).toMatchObject(
        canal.tipo === 'email'
          ? SMTP_ESPERADO
          : { remitente: null, servidor_smtp: null, seguridad: null },
      );
    }
  });

  it('admin obtiene las 11 plantillas sembradas con variables y sin id interno', async () => {
    const response = await http()
      .get(`${URL}/plantillas`)
      .set(auth())
      .expect(200);
    const plantillas = response.body as PlantillaHttp[];
    expect(plantillas.map((plantilla) => plantilla.clave).sort()).toEqual(
      [...CLAVES].sort(),
    );
    for (const plantilla of plantillas) {
      expect(Object.keys(plantilla).sort()).toEqual(
        [
          'clave',
          'nombre',
          'destinatario',
          'variables',
          'asunto',
          'cuerpo',
          'updated_at',
        ].sort(),
      );
      expect(
        plantilla.variables.every((variable) => typeof variable === 'string'),
      ).toBe(true);
      expect(plantilla.asunto.length).toBeGreaterThan(0);
      expect(plantilla.cuerpo.length).toBeGreaterThan(0);
    }
  });

  it.each(CLAVES)('consulta la plantilla %s', async (clave) => {
    const response = await http()
      .get(`${URL}/plantillas/${clave}`)
      .set(auth())
      .expect(200);
    const original = plantillasOriginales.find(
      (plantilla) => plantilla.clave === clave,
    )!;
    expect(response.body).toEqual({
      clave,
      nombre: original.nombre,
      destinatario: original.destinatario,
      variables: original.variables,
      asunto: original.asunto,
      cuerpo: original.cuerpo,
      updated_at: original.updated_at.toISOString(),
    });
  });

  it.each(['email', 'portal'])(
    'apaga y reactiva el canal %s por PATCH',
    async (tipo) => {
      for (const activo of [false, true]) {
        const response = await http()
          .patch(`${URL}/canales/${tipo}`)
          .set(auth())
          .send({ activo })
          .expect(200);
        expect(response.body).toMatchObject({ tipo, activo });
        const listado = (
          await http().get(`${URL}/canales`).set(auth()).expect(200)
        ).body as CanalHttp[];
        expect(listado.find((canal) => canal.tipo === tipo)?.activo).toBe(
          activo,
        );
      }
    },
  );

  it('edita destinatarios portal y conserva la configuracion SMTP al alternar email', async () => {
    const response = await http()
      .patch(`${URL}/canales/email`)
      .set(auth())
      .send({ activo: false })
      .expect(200);
    expect(response.body).toMatchObject({ ...SMTP_ESPERADO, activo: false });
    await http()
      .patch(`${URL}/canales/email`)
      .set(auth())
      .send({ activo: true })
      .expect(200);
    const portal = await http()
      .patch(`${URL}/canales/portal`)
      .set(auth())
      .send({ destinatarios: 'Clientes del Portal B - prueba' })
      .expect(200);
    expect(portal.body).toMatchObject({
      tipo: 'portal',
      destinatarios: 'Clientes del Portal B - prueba',
    });
  });

  it.each([
    { activo: 'false' },
    { activo: 1 },
    { remitente: 'otro@francos.test' },
    { servidor_smtp: 'smtp.otro.test' },
    { seguridad: 'TLS' },
    { destinatarios: 'x'.repeat(201) },
    { id: 'prohibido' },
  ])('rechaza PATCH canal invalido %j sin modificar la fila', async (dto) => {
    const antes = await prisma.canalNotificacion.findUniqueOrThrow({
      where: { tipo: 'email' },
    });
    await http()
      .patch(`${URL}/canales/email`)
      .set(auth())
      .send(dto)
      .expect(400);
    expect(
      await prisma.canalNotificacion.findUniqueOrThrow({
        where: { tipo: 'email' },
      }),
    ).toEqual(antes);
  });

  it.each([
    {
      asunto: 'Hola {{nombre}}',
      cuerpo: '<p>{{ nombre }}: <a href="{{ enlace }}">Confirmar</a></p>',
    },
    { asunto: 'Texto sin variables' },
    { cuerpo: '<p>Un texto nuevo {{nombre}}</p>' },
  ])('PATCH plantilla acepta texto o variables validas: %j', async (dto) => {
    const antes = await prisma.plantillaNotificacion.findUniqueOrThrow({
      where: { clave: 'verificacion_email' },
    });
    const response = await http()
      .patch(`${URL}/plantillas/verificacion_email`)
      .set(auth())
      .send(dto)
      .expect(200);
    const body = response.body as PlantillaHttp;
    expect(body.asunto).toBe(dto.asunto ?? antes.asunto);
    expect(body.cuerpo).toBe(dto.cuerpo ?? antes.cuerpo);
    expect(body.variables).toEqual(antes.variables);
    const guardada = await http()
      .get(`${URL}/plantillas/verificacion_email`)
      .set(auth())
      .expect(200);
    expect(guardada.body).toEqual(body);
  });

  it.each([
    { asunto: '{{inventada}}' },
    { cuerpo: '{{inventada}}' },
    { asunto: '{{nombre}} {{inventada}}' },
    { cuerpo: '{{enlace}} {{inventada}}' },
    { asunto: '{{codigo}}' },
  ])('PATCH plantilla rechaza variables no permitidas: %j', async (dto) => {
    const antes = await prisma.plantillaNotificacion.findUniqueOrThrow({
      where: { clave: 'verificacion_email' },
    });
    const response = await http()
      .patch(`${URL}/plantillas/verificacion_email`)
      .set(auth())
      .send(dto)
      .expect(400);
    expect((response.body as { message: string }).message).toContain(
      'Variables no válidas',
    );
    expect(
      await prisma.plantillaNotificacion.findUniqueOrThrow({
        where: { clave: 'verificacion_email' },
      }),
    ).toEqual(antes);
  });

  it.each([
    { asunto: '' },
    { cuerpo: '' },
    { asunto: 1 },
    { cuerpo: false },
    { asunto: 'x'.repeat(201) },
    { variables: ['inventada'] },
    { nombre: 'otro' },
  ])('valida el DTO y protege campos de plantilla: %j', async (dto) => {
    await http()
      .patch(`${URL}/plantillas/verificacion_email`)
      .set(auth())
      .send(dto)
      .expect(400);
  });

  // Un valor fuera del enum se rechaza en ParseEnumPipe antes del use-case.
  it.each([
    { metodo: 'patch' as const, ruta: '/canales/sms' },
    { metodo: 'get' as const, ruta: '/plantillas/inventada' },
    { metodo: 'patch' as const, ruta: '/plantillas/inventada' },
  ])(
    '$metodo $ruta devuelve 400 por enum invalido',
    async ({ metodo, ruta }) => {
      await http()[metodo](`${URL}${ruta}`).set(auth()).send({}).expect(400);
    },
  );

  it('devuelve 404 si falta la fila de un canal cuyo tipo pertenece al enum', async () => {
    const original = await prisma.canalNotificacion.findUniqueOrThrow({
      where: { tipo: 'email' },
    });
    await prisma.canalNotificacion.delete({ where: { tipo: 'email' } });
    try {
      await http()
        .patch(`${URL}/canales/email`)
        .set(auth())
        .send({ activo: true })
        .expect(404);
    } finally {
      await prisma.canalNotificacion.create({ data: original });
    }
  });

  it('GET y PATCH devuelven 404 si falta una plantilla de clave valida', async () => {
    const original = await prisma.plantillaNotificacion.findUniqueOrThrow({
      where: { clave: 'verificacion_email' },
    });
    await prisma.plantillaNotificacion.delete({
      where: { clave: original.clave },
    });
    try {
      await http()
        .get(`${URL}/plantillas/${original.clave}`)
        .set(auth())
        .expect(404);
      await http()
        .patch(`${URL}/plantillas/${original.clave}`)
        .set(auth())
        .send({ asunto: 'nuevo' })
        .expect(404);
    } finally {
      await prisma.plantillaNotificacion.create({
        data: {
          ...original,
          variables: original.variables as Prisma.InputJsonValue,
        },
      });
    }
  });

  it('el menu admin incluye notificaciones bajo configuracion', async () => {
    interface Nodo {
      nombre: string;
      children: Nodo[];
    }
    const response = await http()
      .get('/api/v1/rutas/mi-menu')
      .set(auth())
      .expect(200);
    const configuracion = (response.body as Nodo[]).find(
      (nodo) => nodo.nombre === 'configuracion',
    );
    expect(configuracion?.children.map((nodo) => nodo.nombre)).toContain(
      'notificaciones',
    );
  });
});
