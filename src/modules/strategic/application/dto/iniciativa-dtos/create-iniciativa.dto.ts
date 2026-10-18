import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateIniciativaDto {
  @ApiProperty({ type: Number, example: 1 })
  @Type(() => Number)
  @IsInt()
  objetivo_estrategico_id!: number;

  @ApiProperty({
    example: 'Implementar programa de fidelización',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre!: string;

  @ApiPropertyOptional({ example: 'Programa dirigido a clientes frecuentes' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ example: 'Gerencia Comercial', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  responsable!: string;

  @ApiProperty({ example: '2026-01-15', format: 'date' })
  @IsDateString()
  fecha_inicio!: string;

  @ApiProperty({ example: '2026-12-15', format: 'date' })
  @IsDateString()
  fecha_fin!: string;
}
