import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class ActualizarDetalleLineaDto {
  @ApiProperty({ example: 60, minimum: 1 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cantidad_solicitada!: number;
}
