import { RutaEntity } from '../../../domain/entities/ruta.entity';
import { RutaRepository } from '../../../domain/repositories/ruta.repository';
import { GetRutasTreeUseCase } from './get-rutas-tree.use-case';

describe('GetRutasTreeUseCase', () => {
  const findAllByStatus = jest.fn();
  const repository = {
    findAllByStatus,
  } as unknown as jest.Mocked<RutaRepository>;
  const useCase = new GetRutasTreeUseCase(repository);

  const fecha = new Date('2026-01-01T00:00:00.000Z');
  const rutaEntity = (id: number, nombre: string, parent_id: number | null) =>
    new RutaEntity(
      id,
      nombre,
      nombre,
      'icono',
      null,
      true,
      parent_id,
      fecha,
      fecha,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('arma el arbol anidado y conserva etiqueta e icono en cada nodo', async () => {
    findAllByStatus.mockResolvedValue([
      rutaEntity(1, 'inventario', null),
      rutaEntity(2, 'insumos', 1),
      rutaEntity(3, 'stock-insumos', 2),
    ]);

    const tree = await useCase.execute();

    expect(findAllByStatus).toHaveBeenCalledWith(true);
    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({
      id: 1,
      nombre: 'inventario',
      etiqueta: 'inventario',
      icono: 'icono',
    });
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].children).toEqual([
      expect.objectContaining({ id: 3, nombre: 'stock-insumos', children: [] }),
    ]);
  });

  it('devuelve varias raices cuando no comparten padre', async () => {
    findAllByStatus.mockResolvedValue([
      rutaEntity(1, 'inventario', null),
      rutaEntity(2, 'ventas', null),
    ]);

    const tree = await useCase.execute();

    expect(tree.map((nodo) => nodo.nombre)).toEqual(['inventario', 'ventas']);
  });

  it('ignora un nodo cuyo padre no esta en el listado activo', async () => {
    findAllByStatus.mockResolvedValue([rutaEntity(2, 'insumos', 1)]);

    const tree = await useCase.execute();

    expect(tree).toEqual([]);
  });

  it('devuelve un arreglo vacio cuando no hay rutas activas', async () => {
    findAllByStatus.mockResolvedValue([]);

    await expect(useCase.execute()).resolves.toEqual([]);
  });
});
