import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateEstadoObjetivoDto {
  @ApiProperty({ enum: ['EN_PROCESO', 'CUMPLIDO', 'CANCELADO'] })
  @IsIn(['EN_PROCESO', 'CUMPLIDO', 'CANCELADO'])
  estado_codigo!: 'EN_PROCESO' | 'CUMPLIDO' | 'CANCELADO';
}
