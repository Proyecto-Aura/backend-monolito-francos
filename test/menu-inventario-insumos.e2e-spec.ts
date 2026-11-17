import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

// Separación del rol "inventario" en "insumos" (nuevo) e "inventario" (solo
// productos terminados): Insumos pasa a módulo de primer nivel y el nodo
// intermedio "productos-terminados" desaparece. Usa los usuarios de prueba
// de prisma/seeds (usuario-prueba-insumos / usuario-prueba-inventario), que
// el globalSetup siembra sobre la plantilla después de migrate deploy.
interface NodoMenu {
  nombre: string;
  etiqueta: string;
  children: NodoMenu[];
}

describe('Menú: Inventario e Insumos como módulos separados (e2e)', () => {
  let app: INestApplication<App>;

  const login = async (identificador: string, password: string) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identificador, password })
      .expect(201);
    return (response.body as { access_token: string }).access_token;
  };

  const miMenu = async (token: string): Promise<NodoMenu[]> => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/rutas/mi-menu')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return response.body as NodoMenu[];
  };

  // El repositorio ordena por nombre; aquí solo importa qué nodos hay.
  const nombres = (nodos: NodoMenu[]) => nodos.map((n) => n.nombre).sort();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('el admin ve Inventario con sus 3 pantallas directas e Insumos como raíz', async () => {
    const menu = await miMenu(await login('admin', 'admin123'));

    const inventario = menu.find((n) => n.nombre === 'inventario');
    expect(inventario).toBeDefined();
    expect(nombres(inventario!.children)).toEqual([
      'pedidos-por-preparar',
      'solicitudes-produccion',
      'stock-productos',
    ]);
    for (const hijo of inventario!.children) {
      expect(hijo.children).toEqual([]);
    }

    const insumos = menu.find((n) => n.nombre === 'insumos');
    expect(insumos).toMatchObject({ etiqueta: 'Insumos' });
    expect(nombres(insumos!.children)).toEqual([
      'solicitudes-insumos',
      'stock-insumos',
    ]);

    const todos = (nodos: NodoMenu[]): string[] =>
      nodos.flatMap((n) => [n.nombre, ...todos(n.children)]);
    expect(todos(menu)).not.toContain('productos-terminados');
  });

  it('el rol insumos ve solo su módulo, como raíz', async () => {
    const menu = await miMenu(await login('insumos_prueba', 'insumos123'));

    expect(nombres(menu)).toEqual(['insumos']);
    expect(nombres(menu[0].children)).toEqual([
      'solicitudes-insumos',
      'stock-insumos',
    ]);
  });

  it('el rol inventario con acceso parcial ve solo stock-productos (y su raíz por ancestro)', async () => {
    const menu = await miMenu(await login('inventario_stock', 'inventario123'));

    expect(nombres(menu)).toEqual(['inventario']);
    expect(nombres(menu[0].children)).toEqual(['stock-productos']);
  });
});
