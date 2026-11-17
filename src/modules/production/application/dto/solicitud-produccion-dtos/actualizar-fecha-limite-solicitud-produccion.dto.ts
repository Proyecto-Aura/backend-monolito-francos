import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty } from 'class-validator';

export class ActualizarFechaLimiteSolicitudProduccionDto {
  @ApiProperty({ example: '2026-11-11', description: 'YYYY-MM-DD' })
  @IsNotEmpty()
  @IsISO8601({ strict: true })
  fecha_limite!: string;
}
