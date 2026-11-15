import { Injectable } from '@nestjs/common';
import { ParametroVentaEntity } from '../../../domain/entities/parametro-venta.entity';
import { InvalidRequestError } from '../../../domain/errors/sales-domain.errors';
import { ParametroVentaRepository } from '../../../domain/repositories/parametro-venta.repository';
import { UpdateParametroVentaDto } from '../../dto/parametro-venta-dtos/update-parametro-venta.dto';

@Injectable()
export class UpdateParametroVentaUseCase {
  constructor(
    private readonly parametroVentaRepository: ParametroVentaRepository,
  ) {}

  // HU-A-045 (RF-A193 a RF-A195). Los rangos del umbral los valida el DTO. La
  // regla que cruza campos: el portal no puede quedarse sin ningún método de pago.
  async execute(dto: UpdateParametroVentaDto): Promise<ParametroVentaEntity> {
    const actual = await this.parametroVentaRepository.get();

    const culqi = dto.culqi_activo ?? actual.culqi_activo;
    const efectivo = dto.efectivo_activo ?? actual.efectivo_activo;

    if (!culqi && !efectivo) {
      throw new InvalidRequestError(
        'Debe quedar al menos un método de pago activo en el portal',
      );
    }

    return this.parametroVentaRepository.update({
      umbral_mayorista_global: dto.umbral_mayorista_global,
      umbral_por_producto: dto.umbral_por_producto,
      promociones_activas: dto.promociones_activas,
      culqi_activo: dto.culqi_activo,
      efectivo_activo: dto.efectivo_activo,
    });
  }
}
