import { TipoPromocion } from '@prisma/client';
import { Transform, TransformFnParams, Type } from 'class-transformer';
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

export class CreatePromocionDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  producto_presentacion_id!: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  nombre!: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  valor!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cantidad_paga?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cantidad_lleva?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cantidad_minima?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  producto_presentacion_regalo_id?: number;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  fecha_inicio!: Date;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  fecha_fin!: Date;

  @IsOptional()
  @Transform((params: TransformFnParams): unknown => {
    const value: unknown = params.value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  estado?: boolean;

  @IsNotEmpty()
  @IsEnum(TipoPromocion)
  tipo!: TipoPromocion;
}
