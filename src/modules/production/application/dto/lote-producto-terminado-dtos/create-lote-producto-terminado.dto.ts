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
import { FECHA_DIA_REGEX } from '../../../../inventory/application/dto/lote-insumo-dtos/create-lote-insumo.dto';

export class CreateLoteProductoTerminadoDto {
  @ApiProperty({
    example: 1,
    minimum: 1,
    description: 'Id del producto terminado (FK, no producto_presentacion_id)',
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  producto_terminado_id!: number;

  @ApiProperty({ example: 'FR-LT-PT-001-261102', maxLength: 50 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  codigo_lote!: string;

  @ApiProperty({ example: '2026-11-02', description: 'YYYY-MM-DD' })
  @IsNotEmpty()
  @Matches(FECHA_DIA_REGEX, {
    message: 'fecha_produccion debe tener el formato YYYY-MM-DD',
  })
  @IsISO8601({ strict: true })
  fecha_produccion!: string;

  @ApiPropertyOptional({ example: '2027-05-02', description: 'YYYY-MM-DD' })
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
    example: 'Producción inicial de lote',
    maxLength: 255,
    description: 'Motivo del movimiento de entrada que genera este lote',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  razon?: string;

  @ApiPropertyOptional({
    example: 12,
    minimum: 1,
    description:
      'Id de la solicitud de producción que este lote cumple, si viene de una',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  solicitud_produccion_id?: number;
}
