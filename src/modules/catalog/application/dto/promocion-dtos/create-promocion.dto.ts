import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Solo fechas de calendario (sin hora): las columnas son DATE.
export const FECHA_DIA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Por ahora la única promoción disponible es el descuento por porcentaje. Los
// demás tipos que admite la tabla (nxm, regalo, monto fijo) no se aceptan.
export class CreatePromocionDto {
  @ApiProperty({
    example: 10,
    minimum: 1,
    description: 'Id de la presentación del producto (producto_presentacion)',
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  producto_presentacion_id!: number;

  @ApiPropertyOptional({
    example: 'Descuento de octubre',
    maxLength: 150,
    description: 'Si se omite se genera como "Descuento {valor}%"',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre?: string;

  @ApiProperty({
    example: 50,
    minimum: 0.01,
    maximum: 99.99,
    description: 'Porcentaje de descuento (hasta 2 decimales)',
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99.99)
  valor!: number;

  @ApiProperty({
    example: '2026-10-01',
    description: 'Primer día de la promoción (YYYY-MM-DD)',
  })
  @IsNotEmpty()
  @Matches(FECHA_DIA_REGEX, {
    message: 'fecha_inicio debe tener el formato YYYY-MM-DD',
  })
  @IsISO8601({ strict: true })
  fecha_inicio!: string;

  @ApiProperty({
    example: '2026-10-31',
    description: 'Último día de la promoción (YYYY-MM-DD), incluido',
  })
  @IsNotEmpty()
  @Matches(FECHA_DIA_REGEX, {
    message: 'fecha_fin debe tener el formato YYYY-MM-DD',
  })
  @IsISO8601({ strict: true })
  fecha_fin!: string;
}
