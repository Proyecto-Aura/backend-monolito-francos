import { PresentacionEntity } from '../../../domain/entities';
import { UnidadMedidaPresentacion } from '../../../domain/enums';
import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';
import { PresentacionRepository } from '../../../domain/repositories/presentacion.repository';
import { ChangePresentacionStatusUseCase } from './change-presentacion-status.use-case';
import { GetPresentacionUseCase } from './get-presentacion.use-case';
import { ListPresentacionUseCase } from './list-presentacion.use-case';

describe('Consultas y estado de presentaciones', () => {
  const findById = jest.fn();
  const findMany = jest.fn();
  const setStatus = jest.fn();
  const presentacionRepository = {
    findById,
    findMany,
    setStatus,
  } as unknown as PresentacionRepository;

  const fecha = new Date('2026-10-01T00:00:00.000Z');
  const presentacion = new PresentacionEntity(
    4,
    500,
    UnidadMedidaPresentacion.GR,
    null,
    true,
    fecha,
    fecha,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GetPresentacionUseCase', () => {
    const useCase = new GetPresentacionUseCase(presentacionRepository);

    it('devuelve la presentación', async () => {
      findById.mockResolvedValue(presentacion);

      await expect(useCase.execute(4)).resolves.toBe(presentacion);
    });

    it('lanza 404 si no existe', async () => {
      findById.mockResolvedValue(null);

      await expect(useCase.execute(99)).rejects.toThrow(
        new ResourceNotFoundError('Presentación no encontrada'),
      );
    });
  });

  describe('ListPresentacionUseCase', () => {
    const useCase = new ListPresentacionUseCase(presentacionRepository);

    it('pasa la paginación y todos los filtros al repositorio', async () => {
      const pagina = { data: [presentacion], total: 1, page: 2, limit: 5 };
      findMany.mockResolvedValue(pagina);

      const resultado = await useCase.execute({
        page: 2,
        limit: 5,
        search: 'bolsa',
        estado: true,
        unidad_medida: UnidadMedidaPresentacion.GR,
        cantidad: 500,
      });

      expect(findMany).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        search: 'bolsa',
        estado: true,
        unidad_medida: 'gr',
        cantidad: 500,
      });
      expect(resultado).toBe(pagina);
    });
  });

  describe('ChangePresentacionStatusUseCase', () => {
    const useCase = new ChangePresentacionStatusUseCase(presentacionRepository);

    it('desactiva la presentación', async () => {
      findById.mockResolvedValue(presentacion);
      setStatus.mockResolvedValue({ ...presentacion, estado: false });

      const resultado = await useCase.execute(4, false);

      expect(setStatus).toHaveBeenCalledWith(4, false);
      expect(resultado.estado).toBe(false);
    });

    it('reactiva la presentación', async () => {
      findById.mockResolvedValue({ ...presentacion, estado: false });
      setStatus.mockResolvedValue(presentacion);

      await useCase.execute(4, true);

      expect(setStatus).toHaveBeenCalledWith(4, true);
    });

    it('lanza 404 y no cambia nada si no existe', async () => {
      findById.mockResolvedValue(null);

      await expect(useCase.execute(99, false)).rejects.toThrow(
        ResourceNotFoundError,
      );
      expect(setStatus).not.toHaveBeenCalled();
    });
  });
});
