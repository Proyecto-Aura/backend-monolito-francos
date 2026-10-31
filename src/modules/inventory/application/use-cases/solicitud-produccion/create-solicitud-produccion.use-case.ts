import { Injectable } from '@nestjs/common';
import { SolicitudProduccionEntity } from '../../../domain/entities';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { ProductoTerminadoRepository } from '../../../domain/repositories/producto-terminado.repository';
import { SolicitudProduccionRepository } from '../../../domain/repositories/solicitud-produccion.repository';
import { CreateSolicitudProduccionDto } from '../../dto/solicitud-produccion-dtos/create-solicitud-produccion.dto';

@Injectable()
export class CreateSolicitudProduccionUseCase {
  constructor(
    private readonly solicitudProduccionRepository: SolicitudProduccionRepository,
    private readonly productoTerminadoRepository: ProductoTerminadoRepository,
  ) {}

  async execute(
    dto: CreateSolicitudProduccionDto,
    solicitadoPor: string,
  ): Promise<SolicitudProduccionEntity> {
    const codigo = dto.codigo.trim();
    const existeCodigo =
      await this.solicitudProduccionRepository.existsByCodigo(codigo);
    if (existeCodigo) {
      throw new ResourceConflictError(
        'Ya existe una solicitud con este código',
      );
    }

    const idsVistos = new Set<number>();
    for (const linea of dto.detalle) {
      if (idsVistos.has(linea.producto_terminado_id)) {
        throw new ResourceConflictError(
          `El producto_terminado_id=${linea.producto_terminado_id} está repetido en el detalle`,
        );
      }
      idsVistos.add(linea.producto_terminado_id);

      const producto = await this.productoTerminadoRepository.findById(
        linea.producto_terminado_id,
      );
      if (!producto) {
        throw new ResourceNotFoundError(
          `Producto terminado no encontrado (producto_terminado_id=${linea.producto_terminado_id})`,
        );
      }
    }

    return this.solicitudProduccionRepository.create({
      codigo,
      fecha_creacion: new Date(),
      fecha_limite: dto.fecha_limite ? new Date(dto.fecha_limite) : null,
      solicitado_por: solicitadoPor,
      detalle: dto.detalle.map((linea) => ({
        producto_terminado_id: linea.producto_terminado_id,
        cantidad_solicitada: linea.cantidad_solicitada,
      })),
    });
  }
}
