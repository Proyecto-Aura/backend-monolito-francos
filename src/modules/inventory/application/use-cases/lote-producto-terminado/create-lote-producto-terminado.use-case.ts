import { Injectable } from '@nestjs/common';
import { LoteProductoTerminadoEntity } from '../../../domain/entities';
import { EstadoLoteProductoTerminado } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { LoteProductoTerminadoRepository } from '../../../domain/repositories/lote-producto-terminado.repository';
import { ProductoTerminadoRepository } from '../../../domain/repositories/producto-terminado.repository';
import { SolicitudProduccionRepository } from '../../../domain/repositories/solicitud-produccion.repository';
import { normalizarTexto } from '../../../../catalog/application/utils/texto.utils';
import {
  parseFechaDia,
  validarFechaVencimiento,
} from '../../utils/lote-insumo.utils';
import { CreateLoteProductoTerminadoDto } from '../../dto/lote-producto-terminado-dtos/create-lote-producto-terminado.dto';

@Injectable()
export class CreateLoteProductoTerminadoUseCase {
  constructor(
    private readonly loteProductoTerminadoRepository: LoteProductoTerminadoRepository,
    private readonly productoTerminadoRepository: ProductoTerminadoRepository,
    private readonly solicitudProduccionRepository: SolicitudProduccionRepository,
  ) {}

  async execute(
    dto: CreateLoteProductoTerminadoDto,
  ): Promise<LoteProductoTerminadoEntity> {
    const productoTerminado = await this.productoTerminadoRepository.findById(
      dto.producto_terminado_id,
    );
    if (!productoTerminado) {
      throw new ResourceNotFoundError('Producto terminado no encontrado');
    }
    if (!productoTerminado.estado) {
      throw new ResourceConflictError('El producto terminado no está activo');
    }

    const codigo_lote = normalizarTexto(dto.codigo_lote);
    const existe =
      await this.loteProductoTerminadoRepository.existsByCodigoLote(
        codigo_lote,
      );
    if (existe) {
      throw new ResourceConflictError('Ya existe un lote con este código');
    }

    const fecha_produccion = parseFechaDia(dto.fecha_produccion);
    const fecha_vencimiento = dto.fecha_vencimiento
      ? parseFechaDia(dto.fecha_vencimiento)
      : null;
    validarFechaVencimiento(fecha_produccion, fecha_vencimiento);

    if (dto.solicitud_produccion_id !== undefined) {
      const solicitud = await this.solicitudProduccionRepository.findById(
        dto.solicitud_produccion_id,
      );
      if (!solicitud) {
        throw new ResourceNotFoundError(
          'Solicitud de producción no encontrada',
        );
      }
    }

    // cantidad_actual no se pasa: el repositorio crea el lote en 0 y lo deja
    // en cantidad_inicial mediante el movimiento "entrada" correspondiente.
    return this.loteProductoTerminadoRepository.create({
      producto_terminado_id: productoTerminado.id,
      codigo_lote,
      fecha_produccion,
      fecha_vencimiento,
      cantidad_inicial: dto.cantidad_inicial,
      estado: EstadoLoteProductoTerminado.ACTIVO,
      activo: dto.activo ?? true,
      razon: dto.razon ?? 'Producción inicial de lote',
      solicitud_produccion_id: dto.solicitud_produccion_id,
    });
  }
}
