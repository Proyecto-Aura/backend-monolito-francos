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
import { ApiPropertyOptional } from '@nestjs/swagger';

const aBoolean = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : String(value);

export class ListProductoPresentacionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'chifles',
    maxLength: 200,
    description: 'Busca en el nombre del producto, el SKU y el slug',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(aBoolean)
  @IsBoolean()
  estado?: boolean;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    description: 'Solo las presentaciones de productos de esta categoría',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  categoria_id?: number;

  @ApiPropertyOptional({
    example: 2,
    minimum: 1,
    description: 'Solo esta presentación (catálogo de presentaciones)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  presentacion_id?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'true: con stock disponible. false: agotadas (sin stock)',
  })
  @IsOptional()
  @Transform(aBoolean)
  @IsBoolean()
  con_stock?: boolean;
}
