import { PresentacionEntity, ProductoEntity } from '../../../domain/entities';
import { UnidadMedidaPresentacion } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { PresentacionRepository } from '../../../domain/repositories/presentacion.repository';
import { ProductoRepository } from '../../../domain/repositories/producto.repository';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';
import { CreateProductoPresentacionDto } from '../../dto/producto_presentacion-dtos/create-producto_presentacion.dto';
import { CreateProductoPresentacionUseCase } from './create-producto_presentacion.use-case';

describe('CreateProductoPresentacionUseCase', () => {
  const existsBySku = jest.fn();
  const existsBySlug = jest.fn();
  const create = jest.fn();
  const findProductoById = jest.fn();
  const findPresentacionById = jest.fn();

  const productoPresentacionRepository = {
    existsBySku,
    existsBySlug,
    create,
  } as unknown as jest.Mocked<ProductoPresentacionRepository>;
  const productoRepository = {
    findById: findProductoById,
  } as unknown as jest.Mocked<ProductoRepository>;
  const presentacionRepository = {
    findById: findPresentacionById,
  } as unknown as jest.Mocked<PresentacionRepository>;

  const useCase = new CreateProductoPresentacionUseCase(
    productoPresentacionRepository,
    productoRepository,
    presentacionRepository,
  );

  const fecha = new Date('2026-10-01T00:00:00.000Z');
  const makeProducto = (estado = true) =>
    new ProductoEntity(
      5,
      1,
      'Chifles clásicos',
      null,
      estado,
      false,
      fecha,
      fecha,
    );
  const makePresentacion = (estado = true) =>
    new PresentacionEntity(
      2,
      200,
      UnidadMedidaPresentacion.GR,
      null,
      estado,
      fecha,
      fecha,
    );

  const dto = (
    overrides: Partial<CreateProductoPresentacionDto> = {},
  ): CreateProductoPresentacionDto => ({
    producto_id: 5,
    presentacion_id: 2,
    precio_unitario: 18,
    precio_mayorista: 15,
    umbral_mayorista: 6,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    findProductoById.mockResolvedValue(makeProducto());
    findPresentacionById.mockResolvedValue(makePresentacion());
    existsBySku.mockResolvedValue(false);
    existsBySlug.mockResolvedValue(false);
    create.mockImplementation((params: object) => Promise.resolve(params));
  });

  describe('registro de la presentación', () => {
    it('crea la presentación con SKU y slug generados', async () => {
      await useCase.execute(dto());

      expect(create).toHaveBeenCalledWith({
        sku: 'FR-P5-PR2',
        precio_unitario: 18,
        precio_mayorista: 15,
        umbral_mayorista: 6,
        producto_id: 5,
        presentacion_id: 2,
        imagen_url: null,
        slug: 'chifles-clasicos-200-gr-p2',
        estado: true,
      });
    });

    it('lanza 404 si el producto no existe', async () => {
      findProductoById.mockResolvedValue(null);

      await expect(useCase.execute(dto())).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
    });

    it('lanza 409 si el producto está inactivo', async () => {
      findProductoById.mockResolvedValue(makeProducto(false));

      await expect(useCase.execute(dto())).rejects.toBeInstanceOf(
        ResourceConflictError,
      );
    });

    it('lanza 404 si la presentación no existe', async () => {
      findPresentacionById.mockResolvedValue(null);

      await expect(useCase.execute(dto())).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
    });

    it('lanza 409 si la presentación está inactiva', async () => {
      findPresentacionById.mockResolvedValue(makePresentacion(false));

      await expect(useCase.execute(dto())).rejects.toBeInstanceOf(
        ResourceConflictError,
      );
    });

    it('lanza 409 si el precio mayorista no es menor que el unitario', async () => {
      await expect(
        useCase.execute(dto({ precio_mayorista: 18 })),
      ).rejects.toBeInstanceOf(ResourceConflictError);
    });

    it('lanza 409 si el producto ya tiene esa presentación', async () => {
      existsBySku.mockResolvedValue(true);

      await expect(useCase.execute(dto())).rejects.toBeInstanceOf(
        ResourceConflictError,
      );
      expect(existsBySku).toHaveBeenCalledWith('FR-P5-PR2');
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('slug único', () => {
    it('si el slug ya lo tiene otro producto usa uno con sufijo', async () => {
      existsBySlug.mockImplementation((slug: string) =>
        Promise.resolve(slug === 'chifles-clasicos-200-gr-p2'),
      );

      await useCase.execute(dto());

      expect(existsBySlug).toHaveBeenCalledWith('chifles-clasicos-200-gr-p2');
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'chifles-clasicos-200-gr-p2-2' }),
      );
    });
  });
});
