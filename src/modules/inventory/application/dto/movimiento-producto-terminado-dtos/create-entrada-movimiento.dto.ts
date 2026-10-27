import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateEntradaMovimientoProductoTerminadoDto {
  @ApiProperty({ example: 4, minimum: 1, description: 'Id del lote (FK)' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  lote_producto_terminado_id!: number;

  @ApiProperty({
    example: 40,
    minimum: 0.01,
    description:
      'Cantidad que ingresa al lote (p.ej. una producción adicional del mismo lote)',
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  cantidad!: number;

  @ApiProperty({ example: 'Segunda hornada del mismo lote', maxLength: 255 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  razon!: string;
}
