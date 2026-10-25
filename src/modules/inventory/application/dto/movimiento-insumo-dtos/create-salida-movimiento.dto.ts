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

export class CreateSalidaMovimientoDto {
  @ApiProperty({ example: 1, minimum: 1, description: 'Id del insumo (FK)' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  insumo_id!: number;

  @ApiProperty({
    example: 50,
    minimum: 0.01,
    description: 'Cantidad a retirar, repartida FEFO entre los lotes activos',
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  cantidad!: number;

  @ApiProperty({ example: 'Consumo en producción', maxLength: 255 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  razon!: string;
}
