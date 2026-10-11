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
        nodo(2, 'insumos', [
          nodo(3, 'stock-insumos'),
          nodo(4, 'solicitudes-insumos'),
        ]),
        nodo(5, 'productos-terminados', [nodo(6, 'stock-productos')]),
      ]),
    ];
    execute.mockResolvedValue(arbolCompleto);
    findActiveRutaIdsByRoleNames.mockResolvedValue([2, 3, 4]);

    const menu = await useCase.execute(['inventario']);

    expect(findActiveRutaIdsByRoleNames).toHaveBeenCalledWith(['inventario']);
    expect(menu).toEqual([
      expect.objectContaining({
        id: 1,
        nombre: 'inventario',
        children: [
          expect.objectContaining({
            id: 2,
            nombre: 'insumos',
            children: [
              expect.objectContaining({ id: 3, children: [] }),
              expect.objectContaining({ id: 4, children: [] }),
            ],
          }),
        ],
      }),
    ]);
  });

  it('un acceso directo a un nodo intermedio lo muestra aunque ninguno de sus hijos tenga acceso', async () => {
    const arbolCompleto: RutaTreeNode[] = [
      nodo(1, 'inventario', [
        nodo(5, 'productos-terminados', [nodo(6, 'stock-productos')]),
      ]),
    ];
    execute.mockResolvedValue(arbolCompleto);
    findActiveRutaIdsByRoleNames.mockResolvedValue([5]);

    const menu = await useCase.execute(['inventario']);

    expect(menu).toEqual([
      expect.objectContaining({
        id: 1,
        children: [expect.objectContaining({ id: 5, children: [] })],
      }),
    ]);
  });

  it('devuelve un arbol vacio cuando el rol no tiene ningun acceso', async () => {
    execute.mockResolvedValue([nodo(1, 'inventario', [nodo(2, 'insumos')])]);
    findActiveRutaIdsByRoleNames.mockResolvedValue([]);

    await expect(useCase.execute(['cliente'])).resolves.toEqual([]);
  });
});
