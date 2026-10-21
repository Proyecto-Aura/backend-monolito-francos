import { Injectable } from '@nestjs/common';
import { InsumoEntity } from '../../../domain/entities';
import { ResourceNotFoundError } from '../../../../catalog/domain/errors/catalog-domain.errors';
import { InsumoRepository } from '../../../domain/repositories/insumo.repository';
import { normalizarTexto } from '../../../../catalog/application/utils/texto.utils';
import { validateStockRange } from '../../utils/insumo.utils';
import { UpdateInsumoDto } from '../../dto/insumo-dtos/update-insumo.dto';

@Injectable()
export class UpdateInsumoUseCase {
  constructor(private readonly insumoRepository: InsumoRepository) {}

  async execute(id: number, dto: UpdateInsumoDto): Promise<InsumoEntity> {
    const insumo = await this.insumoRepository.findById(id);
    if (!insumo) {
      throw new ResourceNotFoundError('Insumo no encontrado');
    }

    const stockMinimo = dto.stock_minimo ?? insumo.stock_minimo;
    const stockMaximo =
      dto.stock_maximo === undefined ? insumo.stock_maximo : dto.stock_maximo;
    validateStockRange(stockMinimo, stockMaximo);

    return this.insumoRepository.update(id, {
      nombre:
        dto.nombre !== undefined ? normalizarTexto(dto.nombre) : undefined,
      descripcion:
        dto.descripcion === undefined
          ? undefined
          : normalizarTexto(dto.descripcion),
      unidad_medida: dto.unidad_medida,
      stock_minimo: dto.stock_minimo,
      stock_maximo: dto.stock_maximo,
      tipo: dto.tipo,
    });
  }
}
