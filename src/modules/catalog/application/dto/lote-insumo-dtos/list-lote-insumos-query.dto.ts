import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoLoteInsumo } from '../../../domain/enums';
import { PaginationQueryDto } from '../common/pagination-query-dto';

export class ListLoteInsumosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'LOTE-2026', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  search?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  insumo_id?: number;

  @ApiPropertyOptional({ enum: EstadoLoteInsumo, example: 'activo' })
  @IsOptional()
  @IsEnum(EstadoLoteInsumo)
  estado?: EstadoLoteInsumo;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (typeof value === 'boolean') return value;
    return String(value);
  })
  @IsBoolean()
  activo?: boolean;
}
