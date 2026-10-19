import { PromocionEntity } from '../../../domain/entities';
import { TipoPromocion } from '../../../domain/enums';
import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';
import { PromocionRepository } from '../../../domain/repositories/promocion.repository';
import { GetPromocionByIdUseCase } from './get-promocion-by-id.use-case';
import { ListPromocionesUseCase } from './list-promociones.use-case';

describe('Consultas de promociones', () => {
  const findById = jest.fn();
  const findMany = jest.fn();
  const promocionRepository = {
    findById,
    findMany,
  } as unknown as jest.Mocked<PromocionRepository>;

  const promocion = new PromocionEntity(
    1,
    10,
    'Descuento 10%',
    TipoPromocion.PORCENTAJE,
    10,
    null,
    null,
    null,
    null,
    new Date('2026-10-01T00:00:00.000Z'),
    new Date('2026-10-31T00:00:00.000Z'),
    true,
    new Date('2026-09-01T00:00:00.000Z'),
    new Date('2026-09-01T00:00:00.000Z'),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GetPromocionByIdUseCase', () => {
    const useCase = new GetPromocionByIdUseCase(promocionRepository);

    it('devuelve la promoción', async () => {
      findById.mockResolvedValue(promocion);

      await expect(useCase.execute(1)).resolves.toBe(promocion);
    });

    it('lanza 404 si no existe', async () => {
      findById.mockResolvedValue(null);

      await expect(useCase.execute(99)).rejects.toBeInstanceOf(
        ResourceNotFoundError,
      );
    });
  });

  describe('ListPromocionesUseCase', () => {
    const useCase = new ListPromocionesUseCase(promocionRepository);

    it('pasa los filtros y la paginación al repositorio', async () => {
      const resultado = { data: [promocion], total: 1, page: 2, limit: 5 };
      findMany.mockResolvedValue(resultado);

      await expect(
        useCase.execute({
          page: 2,
          limit: 5,
          search: 'desc',
          estado: true,
          producto_presentacion_id: 10,
        }),
      ).resolves.toBe(resultado);
      expect(findMany).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        search: 'desc',
        estado: true,
        producto_presentacion_id: 10,
      });
    });
  });
});
