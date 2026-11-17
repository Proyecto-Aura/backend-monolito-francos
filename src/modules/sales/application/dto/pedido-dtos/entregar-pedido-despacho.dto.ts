import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  ValidateNested,
} from 'class-validator';

export class ItemPreparadoDto {
  @ApiProperty({
    example: 10,
    description: 'producto_presentacion_id del item del pedido',
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  producto_presentacion_id!: number;

  @ApiProperty({
    example: 20,
    minimum: 0.01,
    description:
      'Cantidad realmente preparada (puede diferir de lo solicitado)',
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  cantidad_preparada!: number;
}

export class EntregarPedidoADespachoDto {
  @ApiProperty({
    type: () => ItemPreparadoDto,
    isArray: true,
    minItems: 1,
    example: [{ producto_presentacion_id: 10, cantidad_preparada: 20 }],
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemPreparadoDto)
  items!: ItemPreparadoDto[];
}
