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

export class CreateAjusteMovimientoDto {
  @ApiProperty({ example: 4, minimum: 1, description: 'Id del lote (FK)' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  lote_insumo_id!: number;

  @ApiProperty({
    example: -5,
    description:
      'Corrección con signo: positivo suma, negativo resta. No puede ser 0.',
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  cantidad!: number;

  @ApiProperty({ example: 'Merma por rotura en almacén', maxLength: 255 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  razon!: string;
}
