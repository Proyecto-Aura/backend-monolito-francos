import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateEstadoIniciativaDto {
  @ApiProperty({ enum: ['EN_PROCESO', 'COMPLETADA', 'CANCELADA'] })
  @IsIn(['EN_PROCESO', 'COMPLETADA', 'CANCELADA'])
  estado_codigo!: 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA';

  @ApiPropertyOptional({
    example: 'Se reasignó el presupuesto a otra iniciativa prioritaria',
  })
  @ValidateIf((o: UpdateEstadoIniciativaDto) => o.estado_codigo === 'CANCELADA')
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  motivo_cancelacion?: string;
}
