import { TipoPromocion } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePromocionDto {
  @ApiProperty({ example: 5, minimum: 1 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  producto_presentacion_id!: number;

  @ApiProperty({ example: 'Descuento de temporada', maxLength: 150 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  nombre!: string;

  @ApiProperty({ example: 15, minimum: 0.01 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  valor!: number;

  @ApiPropertyOptional({ example: 2, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cantidad_paga?: number;

  @ApiPropertyOptional({ example: 3, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cantidad_lleva?: number;

  @ApiPropertyOptional({ example: 2, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cantidad_minima?: number;

  @ApiPropertyOptional({ example: 8, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  producto_presentacion_regalo_id?: number;

  @ApiProperty({ example: '2026-09-01', type: String, format: 'date' })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  fecha_inicio!: Date;

  @ApiProperty({ example: '2026-09-30', type: String, format: 'date' })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  fecha_fin!: Date;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return typeof value === 'boolean' ? value : String(value);
  })
  @IsBoolean()
  estado?: boolean;

  @ApiProperty({ enum: TipoPromocion, example: TipoPromocion.porcentaje })
  @IsNotEmpty()
  @IsEnum(TipoPromocion)
  tipo!: TipoPromocion;
}
