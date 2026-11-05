import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoLoteProductoTerminado } from '../../../domain/enums';
import { PaginationQueryDto } from '../../../../catalog/application/dto/common/pagination-query-dto';

export class ListLoteProductoTerminadoQueryDto extends PaginationQueryDto {
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
  producto_terminado_id?: number;

  @ApiPropertyOptional({ enum: EstadoLoteProductoTerminado, example: 'activo' })
  @IsOptional()
  @IsEnum(EstadoLoteProductoTerminado)
  estado?: EstadoLoteProductoTerminado;

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

  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsOptional()
  @IsDateString()
  vence_desde?: string;

  @ApiPropertyOptional({ example: '2026-11-30' })
  @IsOptional()
  @IsDateString()
  vence_hasta?: string;
}
