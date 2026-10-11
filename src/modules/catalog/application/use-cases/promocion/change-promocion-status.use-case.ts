import { Injectable } from '@nestjs/common';
import { PromocionEntity } from '../../../domain/entities';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/catalog-domain.errors';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';
import { PromocionRepository } from '../../../domain/repositories/promocion.repository';

@Injectable()
export class ChangePromocionStatusUseCase {
  constructor(
    private readonly promocionRepository: PromocionRepository,
    private readonly productoPresentacionRepository: ProductoPresentacionRepository,
  ) {}

  async execute(id: number, estado: boolean): Promise<PromocionEntity> {
    const promocion = await this.promocionRepository.findById(id);

    if (!promocion) {
      throw new ResourceNotFoundError('Promoción no encontrada');
    }

    if (promocion.estado === estado) {
      return promocion;
    }

    // Desactivar es siempre posible; reactivar vuelve a aplicar las reglas de
    // creación (presentación activa y sin cruces con otra promoción activa).
    if (estado) {
      const productoPresentacion =
        await this.productoPresentacionRepository.findById(
          promocion.producto_presentacion_id,
        );

      if (!productoPresentacion?.estado) {
        throw new ResourceConflictError(
          'La presentación del producto no está activa',
        );
      }

      const seCruza = await this.promocionRepository.existsOverlap({
        producto_presentacion_id: promocion.producto_presentacion_id,
        fecha_inicio: promocion.fecha_inicio,
        fecha_fin: promocion.fecha_fin,
        excludeId: promocion.id,
      });

      if (seCruza) {
        throw new ResourceConflictError(
          'Ya existe otra promoción activa para esta presentación que se cruza con esas fechas',
        );
      }
    }

    return this.promocionRepository.setStatus(id, estado);
  }
}
