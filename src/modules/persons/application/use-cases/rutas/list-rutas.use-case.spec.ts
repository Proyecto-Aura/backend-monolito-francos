import { RutaEntity } from '../../../domain/entities/ruta.entity';
import { RutaRepository } from '../../../domain/repositories/ruta.repository';
import { ListRutasUseCase } from './list-rutas.use-case';

describe('ListRutasUseCase', () => {
  const findMany = jest.fn();
  const repository = {
    findMany,
  } as unknown as jest.Mocked<RutaRepository>;
  const useCase = new ListRutasUseCase(repository);

  const resultado = {
    data: [
      new RutaEntity(
        1,
        'insumos',
        'Insumos',
        'box',
        null,
        true,
        null,
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-01-01T00:00:00.000Z'),
      ),
    ],
    total: 1,
    page: 1,
    limit: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delega los filtros del query al repositorio tal cual', async () => {
    findMany.mockResolvedValue(resultado);

    await expect(
      useCase.execute({
        page: 2,
        limit: 5,
        search: 'insu',
        estado: true,
        parent_id: 1,
      }),
    ).resolves.toBe(resultado);

    expect(findMany).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      search: 'insu',
      estado: true,
      parent_id: 1,
    });
  });

  it('funciona sin filtros opcionales', async () => {
    findMany.mockResolvedValue(resultado);

    await useCase.execute({ page: 1, limit: 10 });

    expect(findMany).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: undefined,
      estado: undefined,
      parent_id: undefined,
    });
  });
});
