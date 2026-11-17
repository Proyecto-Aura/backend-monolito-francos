import { AccesoRepository } from '../../../domain/repositories/acceso.repository';
import { RutaTreeNode } from '../../../domain/repositories/types/ruta-repository.types';
import { GetMiMenuUseCase } from './get-mi-menu.use-case';
import { GetRutasTreeUseCase } from './get-rutas-tree.use-case';

describe('GetMiMenuUseCase', () => {
  const findActiveRutaIdsByRoleNames = jest.fn();
  const accesoRepository = {
    findActiveRutaIdsByRoleNames,
  } as unknown as jest.Mocked<AccesoRepository>;

  const execute = jest.fn();
  const getRutasTree = {
    execute,
  } as unknown as jest.Mocked<GetRutasTreeUseCase>;

  const useCase = new GetMiMenuUseCase(accesoRepository, getRutasTree);

  const fecha = new Date('2026-01-01T00:00:00.000Z');
  const nodo = (
    id: number,
    nombre: string,
    children: RutaTreeNode[] = [],
  ): RutaTreeNode => ({
    id,
    nombre,
    etiqueta: nombre,
    icono: 'icono',
    descripcion: null,
    estado: true,
    parent_id: null,
    created_at: fecha,
    updated_at: fecha,
    children,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deja solo las ramas permitidas, incluyendo ancestros aunque no tengan acceso explicito', async () => {
    const arbolCompleto: RutaTreeNode[] = [
      nodo(1, 'inventario', [
        nodo(2, 'stock-productos'),
        nodo(3, 'pedidos-por-preparar'),
        nodo(4, 'solicitudes-produccion'),
      ]),
      nodo(5, 'insumos', [
        nodo(6, 'stock-insumos'),
        nodo(7, 'solicitudes-insumos'),
      ]),
    ];
    execute.mockResolvedValue(arbolCompleto);
    findActiveRutaIdsByRoleNames.mockResolvedValue([2]);

    const menu = await useCase.execute(['inventario']);

    expect(findActiveRutaIdsByRoleNames).toHaveBeenCalledWith(['inventario']);
    expect(menu).toEqual([
      expect.objectContaining({
        id: 1,
        nombre: 'inventario',
        children: [
          expect.objectContaining({
            id: 2,
            nombre: 'stock-productos',
            children: [],
          }),
        ],
      }),
    ]);
  });

  it('un rol con acceso a dos modulos de primer nivel los ve a ambos como raices', async () => {
    const arbolCompleto: RutaTreeNode[] = [
      nodo(1, 'inventario', [nodo(2, 'stock-productos')]),
      nodo(5, 'insumos', [
        nodo(6, 'stock-insumos'),
        nodo(7, 'solicitudes-insumos'),
      ]),
    ];
    execute.mockResolvedValue(arbolCompleto);
    findActiveRutaIdsByRoleNames.mockResolvedValue([2, 6, 7]);

    const menu = await useCase.execute(['inventario', 'insumos']);

    expect(menu).toEqual([
      expect.objectContaining({
        id: 1,
        children: [expect.objectContaining({ id: 2 })],
      }),
      expect.objectContaining({
        id: 5,
        children: [
          expect.objectContaining({ id: 6, children: [] }),
          expect.objectContaining({ id: 7, children: [] }),
        ],
      }),
    ]);
  });

  it('un acceso directo a un nodo intermedio lo muestra aunque ninguno de sus hijos tenga acceso', async () => {
    const arbolCompleto: RutaTreeNode[] = [
      nodo(1, 'estrategico', [
        nodo(2, 'gestion-estrategica-negocio', [nodo(3, 'mapa-estrategico')]),
      ]),
    ];
    execute.mockResolvedValue(arbolCompleto);
    findActiveRutaIdsByRoleNames.mockResolvedValue([2]);

    const menu = await useCase.execute(['estrategico']);

    expect(menu).toEqual([
      expect.objectContaining({
        id: 1,
        children: [expect.objectContaining({ id: 2, children: [] })],
      }),
    ]);
  });

  it('devuelve un arbol vacio cuando el rol no tiene ningun acceso', async () => {
    execute.mockResolvedValue([nodo(1, 'insumos', [nodo(2, 'stock-insumos')])]);
    findActiveRutaIdsByRoleNames.mockResolvedValue([]);

    await expect(useCase.execute(['cliente'])).resolves.toEqual([]);
  });
});
