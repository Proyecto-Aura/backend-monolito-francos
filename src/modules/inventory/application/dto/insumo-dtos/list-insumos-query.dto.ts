import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NivelStockInsumo, TipoInsumo } from '../../../domain/enums';
import { PaginationQueryDto } from '../../../../catalog/application/dto/common/pagination-query-dto';

export class ListInsumosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'harina', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (typeof value === 'boolean') return value;
    return String(value);
  })
  @IsBoolean()
  estado?: boolean;

  @ApiPropertyOptional({ enum: TipoInsumo, example: 'materia_prima' })
  @IsOptional()
  @IsEnum(TipoInsumo)
  tipo?: TipoInsumo;

  @ApiPropertyOptional({ enum: NivelStockInsumo, example: 'bajo' })
  @IsOptional()
  @IsEnum(NivelStockInsumo)
  nivel?: NivelStockInsumo;
}
