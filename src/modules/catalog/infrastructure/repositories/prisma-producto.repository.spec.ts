import { Prisma, TipoPromocion } from '@prisma/client';
import { TipoPromocion as TipoPromocionDominio } from '../../domain/enums';
import { PrismaProductoRepository } from './prisma-producto.repository';

jest.mock('../../../../infrastructure/database/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('PrismaProductoRepository', () => {
  const now = new Date('2026-08-30T00:00:00.000Z');
  const productoRecord = {
    id: 10,
    categoria_id: 1,
    nombre: 'Arroz Superior',
    descripcion: null,
    estado: true,
    destacado: true,
    created_at: now,
    updated_at: now,
  };
  const productoPresentacionRecord = {
    id: 20,
    sku: 'FR-P10-PR2',
    precio_unitario: new Prisma.Decimal(8.5),
    precio_mayorista: null,
    umbral_mayorista: null,
    producto_id: 10,
    presentacion_id: 2,
    imagen_url: 'https://example.com/arroz.jpg',
    slug: 'arroz-superior-1-kg-p2',
    estado: true,
    created_at: now,
    updated_at: now,
  };
  const promocionRecord = {
    id: 30,
    producto_presentacion_id: 20,
    nombre: 'Oferta',
    tipo: TipoPromocion.porcentaje,
    valor: new Prisma.Decimal(15),
    cantidad_paga: null,
    cantidad_lleva: null,
    cantidad_minima: null,
    producto_presentacion_regalo_id: null,
    fecha_inicio: new Date('2026-09-01'),
    fecha_fin: new Date('2026-09-30'),
    estado: true,
    created_at: now,
    updated_at: now,
  };
  const productoCatalogoRecord = {
    ...productoRecord,
    producto_presentaciones: [
      {
        ...productoPresentacionRecord,
        promociones: [promocionRecord],
      },
    ],
  };

  const setup = () => {
    const captured = {
      productoPresentacionCreates: [] as Array<{
        data: Record<string, unknown>;
      }>,
      promocionCreates: [] as Array<{ data: Record<string, unknown> }>,
    };
    const tx = {
      producto: {
        create: jest.fn().mockResolvedValue(productoRecord),
        update: jest.fn().mockResolvedValue(productoRecord),
        findUnique: jest.fn().mockResolvedValue(productoCatalogoRecord),
      },
      productoPresentacion: {
        create: jest.fn<
          (args: {
            data: Record<string, unknown>;
          }) => Promise<typeof productoPresentacionRecord>
        >((args: { data: Record<string, unknown> }) => {
          captured.productoPresentacionCreates.push(args);
          return Promise.resolve(productoPresentacionRecord);
        }),
        update: jest
          .fn<
            (args: {
              where: { id: number };
              data: Record<string, unknown>;
            }) => Promise<typeof productoPresentacionRecord>
          >()
          .mockResolvedValue(productoPresentacionRecord),
      },
      promocion: {
        create: jest.fn<
          (args: {
            data: Record<string, unknown>;
          }) => Promise<typeof promocionRecord>
        >((args: { data: Record<string, unknown> }) => {
          captured.promocionCreates.push(args);
          return Promise.resolve(promocionRecord);
        }),
        update: jest
          .fn<
            (args: {
              where: { id: number };
              data: Record<string, unknown>;
            }) => Promise<typeof promocionRecord>
          >()
          .mockResolvedValue(promocionRecord),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    const repository = new PrismaProductoRepository(prisma as never);

    return { captured, prisma, repository, tx };
  };

  it('crea producto, presentación y promoción dentro de una transacción', async () => {
    const { captured, prisma, repository } = setup();

    const result = await repository.createWithPresentaciones({
      nombre: 'Arroz Superior',
      categoria_id: 1,
      descripcion: null,
      estado: true,
      destacado: true,
      producto_presentaciones: [
        {
          precio_unitario: 8.5,
          precio_mayorista: null,
          umbral_mayorista: null,
          presentacion_id: 2,
          imagen_url: 'https://example.com/arroz.jpg',
          slug: 'arroz-superior-1-kg-p2',
          estado: true,
          promociones: [
            {
              nombre: 'Oferta',
              tipo: TipoPromocionDominio.PORCENTAJE,
              valor: 15,
              cantidad_paga: null,
              cantidad_lleva: null,
              cantidad_minima: null,
              producto_presentacion_regalo_id: null,
              fecha_inicio: new Date('2026-09-01'),
              fecha_fin: new Date('2026-09-30'),
              estado: true,
            },
          ],
        },
      ],
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(captured.productoPresentacionCreates[0].data).toMatchObject({
      producto_id: 10,
      sku: 'FR-P10-PR2',
      imagen_url: 'https://example.com/arroz.jpg',
    });
    expect(captured.promocionCreates[0].data).toMatchObject({
      producto_presentacion_id: 20,
      nombre: 'Oferta',
    });
    expect(result.producto_presentaciones[0].promociones[0]).toEqual(
      expect.objectContaining({ id: 30, valor: 15 }),
    );
  });

  it('edita y crea promociones dentro de la misma transacción del producto', async () => {
    const { captured, prisma, repository, tx } = setup();
    const promotionData = {
      nombre: 'Oferta',
      tipo: TipoPromocionDominio.PORCENTAJE,
      valor: 20,
      cantidad_paga: null,
      cantidad_lleva: null,
      cantidad_minima: null,
      producto_presentacion_regalo_id: null,
      fecha_inicio: new Date('2026-09-01'),
      fecha_fin: new Date('2026-09-30'),
      estado: true,
    };

    await repository.updateWithPresentaciones(10, {
      destacado: true,
      producto_presentaciones: [
        {
          id: 20,
          precio_unitario: 9,
          promociones: [
            { id: 30, ...promotionData },
            { ...promotionData, nombre: 'Oferta nueva' },
          ],
        },
      ],
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.producto.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { destacado: true },
    });
    expect(tx.productoPresentacion.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: { precio_unitario: 9 },
    });
    expect(tx.promocion.update).toHaveBeenCalledWith({
      where: { id: 30 },
      data: promotionData,
    });
    expect(captured.promocionCreates[0].data).toMatchObject({
      producto_presentacion_id: 20,
      nombre: 'Oferta nueva',
    });
  });
});
