import { TipoPromocion } from '@prisma/client';
import { CategoriaRepository } from '../../../domain/repositories/categoria.repository';
import { ProductoRepository } from '../../../domain/repositories/producto.repository';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';
import { PresentacionRepository } from '../../../domain/repositories/presentacion.repository';
import { PresentacionEntity } from '../../../domain/entities/presentacion.entity';
import { ProductoCatalogo } from '../../../domain/repositories/types/producto-repository.types';
import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';
import {
  TipoPromocion as TipoPromocionDominio,
  UnidadMedidaPresentacion,
} from '../../../domain/enums';
import { UpdateProductoWithPresentacionesDto } from '../../dto/producto-dtos/update-producto-with-presentaciones.dto';
import { UpdateProductoUseCase } from './update-producto.use-case';

describe('UpdateProductoUseCase', () => {
  const now = new Date('2026-08-30T00:00:00.000Z');
  let productoRepository: jest.Mocked<ProductoRepository>;
  let categoriaRepository: jest.Mocked<CategoriaRepository>;
  let productoPresentacionRepository: jest.Mocked<ProductoPresentacionRepository>;
  let presentacionRepository: jest.Mocked<PresentacionRepository>;
  let updateWithPresentacionesMock: jest.Mock;
  let useCase: UpdateProductoUseCase;

  const producto: ProductoCatalogo = {
    id: 10,
    categoria_id: 1,
    nombre: 'Arroz Superior',
    descripcion: null,
    estado: true,
    destacado: false,
    created_at: now,
    updated_at: now,
    producto_presentaciones: [
      {
        id: 20,
        sku: 'FR-P10-PR2',
        precio_unitario: 8.5,
        precio_mayorista: null,
        umbral_mayorista: null,
        producto_id: 10,
        presentacion_id: 2,
        imagen_url: 'https://example.com/arroz.jpg',
        slug: 'arroz-superior-1-kg-p2',
        estado: true,
        created_at: now,
        updated_at: now,
        promociones: [
          {
            id: 30,
            producto_presentacion_id: 20,
            nombre: 'Oferta anterior',
            tipo: TipoPromocionDominio.PORCENTAJE,
            valor: 10,
            cantidad_paga: null,
            cantidad_lleva: null,
            cantidad_minima: null,
            producto_presentacion_regalo_id: null,
            fecha_inicio: new Date('2026-08-01'),
            fecha_fin: new Date('2026-08-31'),
            estado: true,
            created_at: now,
            updated_at: now,
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    updateWithPresentacionesMock = jest.fn().mockResolvedValue(producto);
    productoRepository = {
      findById: jest.fn().mockResolvedValue(producto),
      existsByName: jest.fn(),
      updateWithPresentaciones: updateWithPresentacionesMock,
    } as unknown as jest.Mocked<ProductoRepository>;
    categoriaRepository = {} as jest.Mocked<CategoriaRepository>;
    productoPresentacionRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<ProductoPresentacionRepository>;
    presentacionRepository = {
      findById: jest
        .fn()
        .mockResolvedValue(
          new PresentacionEntity(
            2,
            1,
            UnidadMedidaPresentacion.KG,
            null,
            true,
            now,
            now,
          ),
        ),
    } as unknown as jest.Mocked<PresentacionRepository>;
    useCase = new UpdateProductoUseCase(
      productoRepository,
      categoriaRepository,
      productoPresentacionRepository,
      presentacionRepository,
    );
  });

  it('actualiza precio, imagen y promoción mediante la operación atómica', async () => {
    const dto: UpdateProductoWithPresentacionesDto = {
      destacado: true,
      producto_presentaciones: [
        {
          id: 20,
          precio_unitario: 9,
          imagen_url: 'https://example.com/arroz-nuevo.jpg',
          promociones: [
            {
              id: 30,
              nombre: 'Oferta actualizada',
              tipo: TipoPromocion.porcentaje,
              valor: 20,
              fecha_inicio: new Date('2026-09-01'),
              fecha_fin: new Date('2026-09-30'),
            },
          ],
        },
      ],
    };

    await useCase.execute(10, dto);

    expect(updateWithPresentacionesMock).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        destacado: true,
        producto_presentaciones: [
          expect.objectContaining({
            id: 20,
            precio_unitario: 9,
            imagen_url: 'https://example.com/arroz-nuevo.jpg',
            promociones: [
              expect.objectContaining({
                id: 30,
                nombre: 'Oferta actualizada',
                estado: true,
              }),
            ],
          }),
        ],
      }),
    );
  });

  it('rechaza editar una presentación ajena al producto', async () => {
    await expect(
      useCase.execute(10, {
        producto_presentaciones: [{ id: 999 }],
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);

    expect(updateWithPresentacionesMock).not.toHaveBeenCalled();
  });

  it('regenera los slugs de las presentaciones al renombrar el producto', async () => {
    await useCase.execute(10, { nombre: 'Arroz Premium' });

    expect(updateWithPresentacionesMock).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        nombre: 'Arroz Premium',
        producto_presentaciones: [
          expect.objectContaining({
            id: 20,
            slug: 'arroz-premium-1-kg-p2',
          }),
        ],
      }),
    );
  });
});
