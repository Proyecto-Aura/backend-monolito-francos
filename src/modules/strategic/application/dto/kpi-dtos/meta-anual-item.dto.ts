import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, Max, Min } from 'class-validator';

export class MetaAnualItemDto {
  @ApiProperty({ example: 2027 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  anio!: number;

  @ApiProperty({ example: 20 })
  @IsNumber()
  meta!: number;

  @ApiProperty({ example: '>=', enum: ['>=', '<='] })
  @IsIn(['>=', '<='])
  operador_verde!: '>=' | '<=';

  @ApiProperty({ example: '>=', enum: ['>=', '>', '<=', '<', '='] })
  @IsIn(['>=', '>', '<=', '<', '='])
  operador_amarillo!: '>=' | '>' | '<=' | '<' | '=';

  @ApiProperty({ example: 15 })
  @IsNumber()
  valor_amarillo!: number;
}
