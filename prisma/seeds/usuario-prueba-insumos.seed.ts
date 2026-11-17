import { PrismaClient } from '@prisma/client';
import { seedUsuarioPruebaInterno } from './helpers/usuario-prueba-interno';

// Usuario de prueba con rol "insumos": acceso a todo su módulo (insumos es
// de primer nivel, ya no cuelga de inventario).
export async function seedUsuarioPruebaInsumos(prisma: PrismaClient) {
  await seedUsuarioPruebaInterno(prisma, {
    dni: '00000002',
    username: 'insumos_prueba',
    password: 'insumos123',
    email: 'insumos.prueba@francos.test',
    apellidoPaterno: 'Insumos',
    apellidoMaterno: 'Prueba',
    rol: 'insumos',
    rutasPermitidas: ['insumos', 'stock-insumos', 'solicitudes-insumos'],
  });
}
