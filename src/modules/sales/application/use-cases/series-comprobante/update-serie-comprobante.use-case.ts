import { Injectable } from '@nestjs/common';
import { SerieComprobanteEntity } from '../../../domain/entities/serie-comprobante.entity';
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from '../../../domain/errors/sales-domain.errors';
import { SerieComprobanteRepository } from '../../../domain/repositories/serie-comprobante.repository';
import { UpdateSerieComprobanteDto } from '../../dto/serie-comprobante-dtos/update-serie-comprobante.dto';
import {
  assertRangoValido,
  assertSerieCoincideConTipo,
} from './serie-comprobante.rules';

const CAMPOS_FIJOS_TRAS_EMITIR = [
  'tipo',
  'serie',
  'correlativo_inicio',
] as const;

@Injectable()
export class UpdateSerieComprobanteUseCase {
  constructor(
    private readonly serieComprobanteRepository: SerieComprobanteRepository,
  ) {}

  async execute(
    id: number,
    dto: UpdateSerieComprobanteDto,
  ): Promise<SerieComprobanteEntity> {
    const serie = await this.serieComprobanteRepository.findById(id);
    if (!serie) throw new ResourceNotFoundError('Serie no encontrada');

    return serie.haEmitido
      ? this.actualizarEmitida(serie, dto)
      : this.actualizarSinEmitir(serie, dto);
  }

  // Ya hay números emitidos: solo se amplía el fin y se cambia el umbral.
  private actualizarEmitida(
    serie: SerieComprobanteEntity,
    dto: UpdateSerieComprobanteDto,
  ): Promise<SerieComprobanteEntity> {
    const bloqueados = CAMPOS_FIJOS_TRAS_EMITIR.filter(
      (campo) => dto[campo] !== undefined && dto[campo] !== serie[campo],
    );
    if (bloqueados.length > 0) {
      throw new ResourceConflictError(
        `La serie ya emitió comprobantes: no se puede cambiar ${bloqueados.join(', ')}`,
      );
    }

    if (dto.correlativo_fin !== undefined) {
      if (dto.correlativo_fin < serie.correlativo_actual) {
        throw new ResourceConflictError(
          `correlativo_fin no puede quedar por debajo del último número emitido (${serie.correlativo_actual})`,
        );
      }
      if (dto.correlativo_fin < serie.correlativo_fin) {
        throw new ResourceConflictError(
          'La serie ya emitió comprobantes: correlativo_fin solo se puede ampliar',
        );
      }
    }

    return this.serieComprobanteRepository.update(serie.id, {
      correlativo_fin: dto.correlativo_fin,
      umbral_alerta: dto.umbral_alerta,
    });
  }

  private async actualizarSinEmitir(
    serie: SerieComprobanteEntity,
    dto: UpdateSerieComprobanteDto,
  ): Promise<SerieComprobanteEntity> {
    const tipo = dto.tipo ?? serie.tipo;
    const codigo = dto.serie ?? serie.serie;
    const inicio = dto.correlativo_inicio ?? serie.correlativo_inicio;
    const fin = dto.correlativo_fin ?? serie.correlativo_fin;

    assertSerieCoincideConTipo(tipo, codigo);
    assertRangoValido(inicio, fin);

    if (
      codigo !== serie.serie &&
      (await this.serieComprobanteRepository.existsBySerie(codigo, serie.id))
    ) {
      throw new ResourceConflictError('Ya existe una serie con ese código');
    }

    if (
      serie.estado &&
      tipo !== serie.tipo &&
      (await this.serieComprobanteRepository.existsActivaByTipo(tipo, serie.id))
    ) {
      throw new ResourceConflictError(
        `Ya existe una serie activa de tipo ${tipo}`,
      );
    }

    // Se condiciona a que nadie haya reservado un número desde la lectura.
    return this.serieComprobanteRepository.update(
      serie.id,
      {
        tipo: dto.tipo,
        serie: dto.serie,
        correlativo_inicio: dto.correlativo_inicio,
        correlativo_fin: dto.correlativo_fin,
        umbral_alerta: dto.umbral_alerta,
        correlativo_actual:
          dto.correlativo_inicio === undefined ? undefined : inicio - 1,
      },
      serie.correlativo_actual,
    );
  }
}
