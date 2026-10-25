import { CategoriaEntity, PresentacionEntity } from '../../../domain/entities';
import { UnidadMedidaPresentacion } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { CategoriaRepository } from '../../../domain/repositories/categoria.repository';
import { PresentacionRepository } from '../../../domain/repositories/presentacion.repository';
import { ProductoRepository } from '../../../domain/repositories/producto.repository';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';
import { CreateProductoWithPresentacionesDto } from '../../dto/producto-dtos/create-producto-with-presentaciones.dto';
import { CreateProductoUseCase } from './create-producto.use-case';

describe('CreateProductoUseCase', () => {
  const existsByName = jest.fn();
  const createWithPresentaciones = jest.fn();
  const findCategoriaById = jest.fn();
  const findPresentacionById = jest.fn();
  const existsBySlug = jest.fn();

  const productoRepository = {
    existsByName,
    createWithPresentaciones,
  } as unknown as jest.Mocked<ProductoRepository>;
  const categoriaRepository = {
    findById: findCategoriaById,
  } as unknown as jest.Mocked<CategoriaRepository>;
  const presentacionRepository = {
    findById: findPresentacionById,
  } as unknown as jest.Mocked<PresentacionRepository>;
  const productoPresentacionRepository = {
    existsBySlug,
  } as unknown as jest.Mocked<ProductoPresentacionRepository>;

  const useCase = new CreateProductoUseCase(
    productoRepository,
    categoriaRepository,
    presentacionRepository,
    productoPresentacionRepository,
  );

  const fecha = new Date('2026-10-01T00:00:00.000Z');
  const makeCategoria = (estado = true) =>
    new CategoriaEntity(1, 'Chifles', null, estado, fecha, fecha);
  const makePresentacion = (id: number, estado = true) =>
    new PresentacionEntity(
      id,
      100 * id,
      UnidadMedidaPresentacion.GR,
      null,
      estado,
      fecha,
      fecha,
    );

  const dto = (
    overrides: Partial<CreateProductoWithPresentacionesDto> = {},
  ): CreateProductoWithPresentacionesDto => ({
    categoria_id: 1,
    nombre: 'Chifles clásicos',
    descripcion: 'Plátano en hojuelas',
    destacado: false,
    producto_presentaciones: [
      {
        presentacion_id: 1,
        precio_unitario: 10,
        precio_mayorista: 8,
        umbral_mayorista: 12,
      },
    ],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    existsByName.mockResolvedValue(false);
    existsBySlug.mockResolvedValue(false);
    findCategoriaById.mockResolvedValue(makeCategoria());
    findPresentacionById.mockImplementation((id: number) =>
      Promise.resolve(makePresentacion(id)),
    );
    createWithPresentaciones.mockImplementation((params: object) =>
      Promise.resolve(params),
    );
  });

  describe('registro del producto', () => {
    it('crea el producto con nombre normalizado, slug y valores opcionales en null', async () => {
      await useCase.execute(
        dto({
          nombre: '  Chifles   clásicos ',
          descripcion: undefined,
          producto_presentaciones: [
            { presentacion_id: 1, precio_unitario: 10 },
          ],
        }),
      );

      expect(createWithPresentaciones).toHaveBeenCalledWith({
        nombre: 'Chifles clásicos',
        categoria_id: 1,
        descripcion: null,
        estado: true,
        destacado: false,
        producto_presentaciones: [
          {
            presentacion_id: 1,
            precio_unitario: 10,
            precio_mayorista: null,
            umbral_mayorista: null,
            imagen_key: null,
            slug: 'chifles-clasicos-100-gr-p1',
            estado: false,
          },
        ],
      });
    });

    it('lanza 409 si ya existe un producto con ese nombre', async () => {
      existsByName.mockResolvedValue(true);

      await expect(useCase.execute(dto())).rejects.toBeInstanceOf(
        ResourceConflictError,
      );
      expect(existsByName).toHaveBeenCalledWith('Chifles clásicos');
      expect(createWithPresentaciones).not.toHaveBeenCalled();
    });

    it('lanza 404 si la categoría no existe', async () => {
      findCategoriaById.mockResolvedValue(null);

      await expect(useCase.execute(dto())).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
    });

    it('lanza 409 si la categoría está inactiva', async () => {
      findCategoriaById.mockResolvedValue(makeCategoria(false));

      await expect(useCase.execute(dto())).rejects.toBeInstanceOf(
        ResourceConflictError,
      );
    });

    it('lanza 409 si se repite una presentación dentro del producto', async () => {
      await expect(
        useCase.execute(
          dto({
            producto_presentaciones: [
              { presentacion_id: 1, precio_unitario: 10 },
              { presentacion_id: 1, precio_unitario: 12 },
            ],
          }),
        ),
      ).rejects.toBeInstanceOf(ResourceConflictError);
      expect(createWithPresentaciones).not.toHaveBeenCalled();
    });

    it('lanza 404 si una presentación no existe', async () => {
      findPresentacionById.mockResolvedValue(null);

      await expect(useCase.execute(dto())).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
    });

    it('lanza 409 si una presentación está inactiva', async () => {
      findPresentacionById.mockResolvedValue(makePresentacion(1, false));

      await expect(useCase.execute(dto())).rejects.toBeInstanceOf(
        ResourceConflictError,
      );
    });

    it('lanza 409 si envía precio mayorista sin umbral mayorista', async () => {
      await expect(
        useCase.execute(
          dto({
            producto_presentaciones: [
              { presentacion_id: 1, precio_unitario: 10, precio_mayorista: 8 },
            ],
          }),
        ),
      ).rejects.toBeInstanceOf(ResourceConflictError);
    });

    it('lanza 409 si el precio mayorista no es menor que el unitario', async () => {
      await expect(
        useCase.execute(
          dto({
            producto_presentaciones: [
              {
                presentacion_id: 1,
                precio_unitario: 10,
                precio_mayorista: 10,
                umbral_mayorista: 12,
              },
            ],
          }),
        ),
      ).rejects.toBeInstanceOf(ResourceConflictError);
    });
  });

  describe('slug único', () => {
    it('si el slug ya lo tiene otro producto (por ejemplo tras renombrarlo) usa uno con sufijo', async () => {
      existsBySlug.mockImplementation((slug: string) =>
        Promise.resolve(slug === 'chifles-clasicos-100-gr-p1'),
      );

      await useCase.execute(dto());

      expect(existsBySlug).toHaveBeenCalledWith('chifles-clasicos-100-gr-p1');
      expect(createWithPresentaciones).toHaveBeenCalledWith(
        expect.objectContaining({
          producto_presentaciones: [
            expect.objectContaining({ slug: 'chifles-clasicos-100-gr-p1-2' }),
          ],
        }),
      );
    });

    it('revisa el slug de cada presentación', async () => {
      await useCase.execute(
        dto({
          producto_presentaciones: [
            { presentacion_id: 1, precio_unitario: 10 },
            { presentacion_id: 2, precio_unitario: 18 },
          ],
        }),
      );

      expect(existsBySlug).toHaveBeenCalledWith('chifles-clasicos-100-gr-p1');
      expect(existsBySlug).toHaveBeenCalledWith('chifles-clasicos-200-gr-p2');
    });
  });
});
