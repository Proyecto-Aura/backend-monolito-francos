import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CrearDetalleLineaInsumoDto {
  @ApiProperty({ example: 12, minimum: 1, description: 'Id de insumo' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  insumo_id!: number;

  @ApiProperty({ example: 50, minimum: 0.01 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  cantidad_solicitada!: number;
}
