import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateObjetivoEstrategicoDto {
  @ApiProperty({ type: Number, example: 1 })
  @Type(() => Number)
  @IsInt()
  plan_estrategico_id!: number;

  @ApiProperty({ type: Number, example: 1 })
  @Type(() => Number)
  @IsInt()
  perspectiva_bsc_id!: number;

  @ApiProperty({ example: 'Incrementar la rentabilidad', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre!: string;

  @ApiProperty({ example: 'Mejorar el margen operativo de la empresa' })
  @IsString()
  @IsNotEmpty()
  descripcion!: string;

  @ApiProperty({ example: 'Carlos Mendoza', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  responsable!: string;

  @ApiPropertyOptional({ type: [Number], example: [2, 3], default: [] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  relaciones_destino_ids: number[] = [];
}
