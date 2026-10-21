import { Injectable } from '@nestjs/common';
import { InsumoEntity } from '../../../domain/entities';
import { InsumoRepository } from '../../../domain/repositories/insumo.repository';
import { normalizarTexto } from '../../utils/texto.utils';
import { validateStockRange } from '../../utils/insumo.utils';
import { CreateInsumoDto } from '../../dto/insumo-dtos/create-insumo.dto';

@Injectable()
export class CreateInsumoUseCase {
  constructor(private readonly insumoRepository: InsumoRepository) {}

  async execute(dto: CreateInsumoDto): Promise<InsumoEntity> {
    validateStockRange(dto.stock_minimo, dto.stock_maximo);

    return this.insumoRepository.create({
      nombre: normalizarTexto(dto.nombre),
      descripcion: dto.descripcion ? normalizarTexto(dto.descripcion) : null,
      unidad_medida: dto.unidad_medida,
      // Un insumo nuevo todavía no tiene lotes: stock_actual arranca en 0 y
      // lo mantiene sincronizado el trigger trg_recalcular_stock_insumo.
      stock_actual: 0,
      stock_minimo: dto.stock_minimo,
      stock_maximo: dto.stock_maximo,
      tipo: dto.tipo,
      estado: dto.estado ?? true,
    });
  }
}
