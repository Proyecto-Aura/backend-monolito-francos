import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { CreatePPSinIdProducto } from '../producto_presentacion-dtos/create_pp-sin-id-producto.dto';
import { CreateProductoDto } from './create-producto.dto';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductoWithPresentacionesDto extends CreateProductoDto {
  @ApiProperty({
    type: () => CreatePPSinIdProducto,
    isArray: true,
    minItems: 1,
    example: [
      {
        precio_unitario: 8.5,
        precio_mayorista: 7.5,
        umbral_mayorista: 12,
        presentacion_id: 1,
        imagen_url: 'https://example.com/arroz-superior-1kg.jpg',
        estado: true,
      },
    ],
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true }) // Obliga a validar CADA objeto dentro del arreglo
  @Type(() => CreatePPSinIdProducto)
  producto_presentaciones!: CreatePPSinIdProducto[];
}
