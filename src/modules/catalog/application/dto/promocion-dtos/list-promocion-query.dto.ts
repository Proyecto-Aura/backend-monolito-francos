import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../common/pagination-query-dto';

export class ListPromocionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'octubre', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : String(value),
  )
  @IsBoolean()
  estado?: boolean;

  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    description: 'Solo las promociones de esta presentación del producto',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  producto_presentacion_id?: number;
}
