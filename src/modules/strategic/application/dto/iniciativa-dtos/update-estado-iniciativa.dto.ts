import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateEstadoIniciativaDto {
  @ApiProperty({ enum: ['EN_PROCESO', 'COMPLETADA', 'CANCELADA'] })
  @IsIn(['EN_PROCESO', 'COMPLETADA', 'CANCELADA'])
  estado_codigo!: 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA';
}
