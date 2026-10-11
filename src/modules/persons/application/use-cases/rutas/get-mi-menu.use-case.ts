import { Injectable } from '@nestjs/common';
import { AccesoRepository } from '../../../domain/repositories/acceso.repository';
import { RutaTreeNode } from '../../../domain/repositories/types/ruta-repository.types';
import { GetRutasTreeUseCase } from './get-rutas-tree.use-case';

@Injectable()
export class GetMiMenuUseCase {
  constructor(
    private readonly accesoRepository: AccesoRepository,
    private readonly getRutasTree: GetRutasTreeUseCase,
  ) {}

  async execute(roles: string[]): Promise<RutaTreeNode[]> {
    const [tree, allowedIds] = await Promise.all([
      this.getRutasTree.execute(),
      this.accesoRepository.findActiveRutaIdsByRoleNames(roles),
    ]);

    const allowed = new Set(allowedIds);

    return this.filterByAccess(tree, allowed);
  }

  /**
   * Deja solo los nodos permitidos explicitamente, mas sus ancestros
   * (un padre sin acceso propio igual se muestra si algun hijo si lo tiene,
   * para que el hijo no quede huerfano sin forma de llegar a el en el menu).
   */
  private filterByAccess(
    nodes: RutaTreeNode[],
    allowed: Set<number>,
  ): RutaTreeNode[] {
    const result: RutaTreeNode[] = [];

    for (const node of nodes) {
      const children = this.filterByAccess(node.children, allowed);

      if (allowed.has(node.id) || children.length > 0) {
        result.push({ ...node, children });
      }
    }

    return result;
  }
}
