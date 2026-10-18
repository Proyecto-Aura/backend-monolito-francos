import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { OrdenCatalogoPublico } from '../../../domain/repositories/types/catalogo-publico-repository.types';
import { PaginationQueryDto } from '../common/pagination-query-dto';

// Solo lo que el cliente puede elegir. La visibilidad (activo, visible en el
// Portal B, producto y categoría activos) no es un parámetro: cualquier otro
// campo de la query se rechaza con 400.
export class ListCatalogoPublicoQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'chifles',
    maxLength: 200,
    description: 'Busca en el nombre del producto (sin distinguir mayúsculas)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    description: 'Solo los productos de esta categoría',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  categoria_id?: number;

  @ApiPropertyOptional({
    enum: OrdenCatalogoPublico,
    description:
      'Orden por precio. Si se omite: primero los destacados y luego por nombre',
  })
  @IsOptional()
  @IsEnum(OrdenCatalogoPublico)
  orden?: OrdenCatalogoPublico;
}
