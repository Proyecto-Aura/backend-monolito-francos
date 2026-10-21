import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoInsumo, UnidadMedidaInsumo } from '../../../domain/enums';

export class CreateInsumoDto {
  @ApiProperty({ example: 'Harina de trigo', maxLength: 150 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  nombre!: string;

  @ApiPropertyOptional({
    example: 'Harina de trigo 000, marca Nicolini',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;

  @ApiProperty({ enum: UnidadMedidaInsumo, example: 'kg' })
  @IsEnum(UnidadMedidaInsumo)
  unidad_medida!: UnidadMedidaInsumo;

  @ApiProperty({ example: 10, minimum: 0 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  stock_minimo!: number;

  @ApiProperty({ example: 500, minimum: 0 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  stock_maximo!: number;

  @ApiProperty({ enum: TipoInsumo, example: 'materia_prima' })
  @IsEnum(TipoInsumo)
  tipo!: TipoInsumo;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return typeof value === 'boolean' ? value : String(value);
  })
  @IsBoolean()
  estado?: boolean;
}
