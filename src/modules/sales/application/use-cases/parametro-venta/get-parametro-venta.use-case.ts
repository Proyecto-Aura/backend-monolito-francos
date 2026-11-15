import { Injectable } from '@nestjs/common';
import { ParametroVentaEntity } from '../../../domain/entities/parametro-venta.entity';
import { ParametroVentaRepository } from '../../../domain/repositories/parametro-venta.repository';

@Injectable()
export class GetParametroVentaUseCase {
  constructor(
    private readonly parametroVentaRepository: ParametroVentaRepository,
  ) {}

  execute(): Promise<ParametroVentaEntity> {
    return this.parametroVentaRepository.get();
  }
}
