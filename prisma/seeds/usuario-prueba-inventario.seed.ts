import { PrismaClient } from '@prisma/client';
import { seedUsuarioPruebaInterno } from './helpers/usuario-prueba-interno';

// Usuario de prueba con rol "inventario" (solo productos terminados) y acceso
// PARCIAL a su módulo: solo "stock-productos", sin "pedidos-por-preparar" ni
// "solicitudes-produccion" -- para probar que GET /rutas/mi-menu filtra bien
// por rol. No se le da acceso a "inventario", el nodo raíz, a propósito:
// debería aparecer solo por ser ancestro de "stock-productos".
export async function seedUsuarioPruebaInventario(prisma: PrismaClient) {
  await seedUsuarioPruebaInterno(prisma, {
    dni: '00000004',
    username: 'inventario_stock',
    password: 'inventario123',
    email: 'inventario.stock@francos.test',
    apellidoPaterno: 'Inventario',
    apellidoMaterno: 'Stock',
    rol: 'inventario',
    rutasPermitidas: ['stock-productos'],
  });
}
