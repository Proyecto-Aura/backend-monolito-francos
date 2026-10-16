import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';
import { ListProductoPresentacionesUseCase } from './list-producto_presentacion.use-case';

describe('ListProductoPresentacionesUseCase', () => {
  const findMany = jest.fn();
  const productoPresentacionRepository = {
    findMany,
  } as unknown as jest.Mocked<ProductoPresentacionRepository>;
  const useCase = new ListProductoPresentacionesUseCase(
    productoPresentacionRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // 22:00 del 8 de octubre en Lima ya es el 9 en UTC.
    jest.setSystemTime(new Date('2026-10-09T03:00:00.000Z'));
    findMany.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('pasa la paginación y todos los filtros al repositorio', async () => {
    await useCase.execute({
      page: 2,
      limit: 5,
      search: 'chifles',
      estado: true,
      categoria_id: 1,
      presentacion_id: 3,
      con_stock: false,
    });

    expect(findMany).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      search: 'chifles',
      estado: true,
      categoria_id: 1,
      presentacion_id: 3,
      con_stock: false,
      fecha_referencia: new Date('2026-10-08T00:00:00.000Z'),
    });
  });

  it('usa el día de Lima, y no el de UTC, para decidir qué promoción está vigente', async () => {
    await useCase.execute({ page: 1, limit: 10 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        fecha_referencia: new Date('2026-10-08T00:00:00.000Z'),
      }),
    );
  });

  it('devuelve lo que entrega el repositorio', async () => {
    const resultado = { data: [], total: 0, page: 1, limit: 10 };
    findMany.mockResolvedValue(resultado);

    await expect(useCase.execute({ page: 1, limit: 10 })).resolves.toBe(
      resultado,
    );
  });
});
