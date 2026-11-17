import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

// Solo stock_minimo/stock_maximo: el resto de la ficha (nombre, categoría,
// presentación, precio) se edita en /producto-presentaciones, no acá.
export class UpdateProductoTerminadoDto {
  @ApiPropertyOptional({ example: 10, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  stock_minimo?: number;

  @ApiPropertyOptional({ example: 500, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  stock_maximo?: number;
}
