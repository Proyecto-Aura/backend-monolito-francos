import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { MetaAnualItemDto } from './meta-anual-item.dto';

export class CreateKpiDto {
  @ApiProperty({ type: Number, example: 1 })
  @Type(() => Number)
  @IsInt()
  objetivo_estrategico_id!: number;

  @ApiProperty({
    example: 'Tasa de conversión de prospectos',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre!: string;

  @ApiProperty({
    example: 'Clientes nuevos / Prospectos contactados x 100',
  })
  @IsString()
  @IsNotEmpty()
  formula!: string;

  @ApiProperty({ type: Number, example: 3 })
  @Type(() => Number)
  @IsInt()
  frecuencia_id!: number;

  @ApiProperty({ type: Number, example: 1 })
  @Type(() => Number)
  @IsInt()
  unidad_medida_id!: number;

  @ApiProperty({ type: [MetaAnualItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MetaAnualItemDto)
  metas_por_anio!: MetaAnualItemDto[];
}
