import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, Min } from 'class-validator';

// Solo stock_minimo/stock_maximo: el resto de la ficha (nombre, categoría,
// presentación, precio) se edita en /producto-presentaciones, no acá.
export class UpdateProductoTerminadoDto {
  @ApiPropertyOptional({ example: 10, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  stock_minimo?: number;

  // Mayor a 0: los niveles "alto"/"normal" dividen entre el máximo.
  @ApiPropertyOptional({ example: 500, exclusiveMinimum: true, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  stock_maximo?: number;
}
