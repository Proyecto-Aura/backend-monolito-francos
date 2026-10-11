import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
} from 'class-validator';
import { UnidadMedidaPresentacion } from '../../../domain/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePresentacionDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(1_000_000)
  cantidad!: number;

  @ApiProperty({ enum: UnidadMedidaPresentacion, example: 'kg' })
  @IsEnum(UnidadMedidaPresentacion)
  unidad_medida!: UnidadMedidaPresentacion;

  @ApiPropertyOptional({ example: 'Bolsa de un kilogramo', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;

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
