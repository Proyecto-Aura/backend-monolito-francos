import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePlanEstrategicoDto {
  @ApiProperty({ example: 'Plan Estratégico 2026-2030', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre!: string;

  @ApiPropertyOptional({
    example: 'Plan estratégico institucional para el periodo 2026-2030',
  })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ example: 2026, minimum: 2000, maximum: 2100 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  anio_inicio!: number;

  @ApiProperty({ example: 2030, minimum: 2000, maximum: 2100 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  anio_fin!: number;
}
