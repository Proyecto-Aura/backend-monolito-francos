import { Injectable } from '@nestjs/common';
import { RutaRepository } from '../../../domain/repositories/ruta.repository';
import { RutaTreeNode } from '../../../domain/repositories/types/ruta-repository.types';

@Injectable()
export class GetRutasTreeUseCase {
  constructor(private readonly rutaRepository: RutaRepository) {}

  async execute(): Promise<RutaTreeNode[]> {
    const rutas = await this.rutaRepository.findAllByStatus(true);
    const nodes = new Map<number, RutaTreeNode>();

    for (const ruta of rutas) {
      nodes.set(ruta.id, {
        id: ruta.id,
        nombre: ruta.nombre,
        estado: ruta.estado,
        parent_id: ruta.parent_id,
        created_at: ruta.created_at,
        updated_at: ruta.updated_at,
        children: [],
      });
    }

    const roots: RutaTreeNode[] = [];

    for (const node of nodes.values()) {
      if (node.parent_id === null) {
        roots.push(node);
        continue;
      }

      const parent = nodes.get(node.parent_id);

      if (parent) {
        parent.children.push(node);
      }
    }

    return roots;
  }
}
