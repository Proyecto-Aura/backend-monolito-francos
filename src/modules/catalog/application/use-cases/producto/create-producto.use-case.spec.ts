import { TipoPromocion } from '@prisma/client';
import { CategoriaEntity } from '../../../domain/entities/categoria.entity';
import { PresentacionEntity } from '../../../domain/entities/presentacion.entity';
import { UnidadMedidaPresentacion } from '../../../domain/enums';
import { ResourceConflictError } from '../../../domain/errors/catalog-domain.errors';
import { CategoriaRepository } from '../../../domain/repositories/categoria.repository';
import { PresentacionRepository } from '../../../domain/repositories/presentacion.repository';
import { ProductoRepository } from '../../../domain/repositories/producto.repository';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';
import { ProductoCatalogo } from '../../../domain/repositories/types/producto-repository.types';
import { CreateProductoWithPresentacionesDto } from '../../dto/producto-dtos/create-producto-with-presentaciones.dto';
import { CreateProductoUseCase } from './create-producto.use-case';

describe('CreateProductoUseCase', () => {
  const now = new Date('2026-08-30T00:00:00.000Z');
  let productoRepository: jest.Mocked<ProductoRepository>;
  let categoriaRepository: jest.Mocked<CategoriaRepository>;
  let presentacionRepository: jest.Mocked<PresentacionRepository>;
  let productoPresentacionRepository: jest.Mocked<ProductoPresentacionRepository>;
  let createWithPresentacionesMock: jest.Mock;
  let useCase: CreateProductoUseCase;

  beforeEach(() => {
    createWithPresentacionesMock = jest.fn();
    productoRepository = {
      existsByName: jest.fn(),
      createWithPresentaciones: createWithPresentacionesMock,
    } as unknown as jest.Mocked<ProductoRepository>;
    categoriaRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<CategoriaRepository>;
    presentacionRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<PresentacionRepository>;
    productoPresentacionRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<ProductoPresentacionRepository>;
    useCase = new CreateProductoUseCase(
      productoRepository,
      categoriaRepository,
      presentacionRepository,
      productoPresentacionRepository,
    );
  });

  const dto = (): CreateProductoWithPresentacionesDto => ({
    categoria_id: 1,
    nombre: '  Arroz   Superior ',
    destacado: true,
    producto_presentaciones: [
      {
        precio_unitario: 8.5,
        presentacion_id: 2,
        imagen_url: 'https://example.com/arroz.jpg',
        promociones: [
          {
            nombre: '  Oferta   de septiembre ',
            tipo: TipoPromocion.porcentaje,
            valor: 15,
            fecha_inicio: new Date('2026-09-01'),
            fecha_fin: new Date('2026-09-30'),
          },
        ],
      },
    ],
  });

  beforeEach(() => {
    productoRepository.existsByName.mockResolvedValue(false);
    categoriaRepository.findById.mockResolvedValue(
      new CategoriaEntity(1, 'Abarrotes', null, true, now, now),
    );
    presentacionRepository.findById.mockResolvedValue(
      new PresentacionEntity(
        2,
        1,
        UnidadMedidaPresentacion.KG,
        null,
        true,
        now,
        now,
      ),
    );
    createWithPresentacionesMock.mockResolvedValue({
      id: 10,
      categoria_id: 1,
      nombre: 'Arroz Superior',
      descripcion: null,
      estado: true,
      destacado: true,
      created_at: now,
      updated_at: now,
      producto_presentaciones: [],
    } satisfies ProductoCatalogo);
  });

  it('persiste producto, precio, imagen y promoción como un agregado', async () => {
    await useCase.execute(dto());

    expect(createWithPresentacionesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Arroz Superior',
        categoria_id: 1,
        destacado: true,
        producto_presentaciones: [
          expect.objectContaining({
            precio_unitario: 8.5,
            imagen_url: 'https://example.com/arroz.jpg',
            promociones: [
              expect.objectContaining({
                nombre: 'Oferta de septiembre',
                tipo: TipoPromocion.porcentaje,
                valor: 15,
              }),
            ],
          }),
        ],
      }),
    );
  });

  it('rechaza una promoción inválida antes de persistir', async () => {
    const invalidDto = dto();
    invalidDto.producto_presentaciones[0].promociones![0].fecha_fin = new Date(
      '2026-08-31',
    );

    await expect(useCase.execute(invalidDto)).rejects.toBeInstanceOf(
      ResourceConflictError,
    );
    expect(createWithPresentacionesMock).not.toHaveBeenCalled();
  });
});
