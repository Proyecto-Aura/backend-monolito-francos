import { Injectable } from '@nestjs/common';
import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';
import { CatalogoPublicoRepository } from '../../../domain/repositories/catalogo-publico.repository';
import { CatalogoPublicoProducto } from '../../../domain/repositories/types/catalogo-publico-repository.types';
import { fechaHoy, parseFechaDia } from '../../utils/promocion.utils';

@Injectable()
export class GetProductoPublicoUseCase {
  constructor(
    private readonly catalogoPublicoRepository: CatalogoPublicoRepository,
  ) {}

  async execute(id: number): Promise<CatalogoPublicoProducto> {
    const producto = await this.catalogoPublicoRepository.findProducto(
      id,
      // "Hoy" para las promociones es el día de Lima, no el de UTC.
      parseFechaDia(fechaHoy()),
    );

    // Oculto, inactivo o inexistente: para el cliente es lo mismo.
    if (!producto) {
      throw new ResourceNotFoundError('Producto no encontrado');
    }

    return producto;
  }
}
