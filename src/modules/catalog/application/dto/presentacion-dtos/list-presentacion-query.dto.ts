import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { UnidadMedidaPresentacion } from '../../../domain/enums';
import { PaginationQueryDto } from '../../dto/common/pagination-query-dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListPresentacionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'bolsa', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
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

  @ApiPropertyOptional({ enum: UnidadMedidaPresentacion, example: 'kg' })
  @IsOptional()
  @IsEnum(UnidadMedidaPresentacion)
  unidad_medida?: UnidadMedidaPresentacion;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  cantidad?: number;
}
