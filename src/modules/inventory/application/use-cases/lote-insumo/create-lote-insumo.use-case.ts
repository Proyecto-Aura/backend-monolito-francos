import { Injectable } from '@nestjs/common';
import { LoteInsumoEntity } from '../../../domain/entities';
import { EstadoLoteInsumo } from '../../../domain/enums';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../../catalog/domain/errors/catalog-domain.errors';
import { InsumoRepository } from '../../../domain/repositories/insumo.repository';
import { LoteInsumoRepository } from '../../../domain/repositories/lote-insumo.repository';
import { normalizarTexto } from '../../../../catalog/application/utils/texto.utils';
import {
  parseFechaDia,
  validarFechaVencimiento,
} from '../../utils/lote-insumo.utils';
import { CreateLoteInsumoDto } from '../../dto/lote-insumo-dtos/create-lote-insumo.dto';

@Injectable()
export class CreateLoteInsumoUseCase {
  constructor(
    private readonly loteInsumoRepository: LoteInsumoRepository,
    private readonly insumoRepository: InsumoRepository,
  ) {}

  async execute(dto: CreateLoteInsumoDto): Promise<LoteInsumoEntity> {
    const insumo = await this.insumoRepository.findById(dto.insumo_id);
    if (!insumo) {
      throw new ResourceNotFoundError('Insumo no encontrado');
    }
    if (!insumo.estado) {
      throw new ResourceConflictError('El insumo no está activo');
    }

    const codigo_lote = normalizarTexto(dto.codigo_lote);
    const existe =
      await this.loteInsumoRepository.existsByCodigoLote(codigo_lote);
    if (existe) {
      throw new ResourceConflictError('Ya existe un lote con este código');
    }

    const fecha_ingreso = parseFechaDia(dto.fecha_ingreso);
    const fecha_vencimiento = dto.fecha_vencimiento
      ? parseFechaDia(dto.fecha_vencimiento)
      : null;
    validarFechaVencimiento(fecha_ingreso, fecha_vencimiento);

    // cantidad_actual no se pasa: el repositorio crea el lote en 0 y lo deja
    // en cantidad_inicial mediante el movimiento "entrada" correspondiente.
    return this.loteInsumoRepository.create({
      insumo_id: insumo.id,
      codigo_lote,
      fecha_ingreso,
      fecha_vencimiento,
      cantidad_inicial: dto.cantidad_inicial,
      estado: EstadoLoteInsumo.ACTIVO,
      activo: dto.activo ?? true,
      razon: dto.razon ?? 'Ingreso inicial de lote',
    });
  }
}
