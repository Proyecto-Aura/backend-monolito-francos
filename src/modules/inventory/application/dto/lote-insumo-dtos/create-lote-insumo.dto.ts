import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Min,
  MaxLength,
} from 'class-validator';

// Solo fechas de calendario (sin hora): las columnas son DATE.
export const FECHA_DIA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateLoteInsumoDto {
  @ApiProperty({ example: 1, minimum: 1, description: 'Id del insumo (FK)' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  insumo_id!: number;

  @ApiProperty({ example: 'LOTE-2026-001', maxLength: 50 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  codigo_lote!: string;

  @ApiProperty({ example: '2026-10-17', description: 'YYYY-MM-DD' })
  @IsNotEmpty()
  @Matches(FECHA_DIA_REGEX, {
    message: 'fecha_ingreso debe tener el formato YYYY-MM-DD',
  })
  @IsISO8601({ strict: true })
  fecha_ingreso!: string;

  @ApiPropertyOptional({ example: '2027-04-17', description: 'YYYY-MM-DD' })
  @IsOptional()
  @Matches(FECHA_DIA_REGEX, {
    message: 'fecha_vencimiento debe tener el formato YYYY-MM-DD',
  })
  @IsISO8601({ strict: true })
  fecha_vencimiento?: string;

  @ApiProperty({ example: 100, minimum: 0 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cantidad_inicial!: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return typeof value === 'boolean' ? value : String(value);
  })
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({
    example: 'Ingreso inicial de lote',
    maxLength: 255,
    description: 'Motivo del movimiento de entrada que genera este lote',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  razon?: string;
}
