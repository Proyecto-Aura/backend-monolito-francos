import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { CreateProductoPresentacionDto } from '../producto_presentacion-dtos/create-producto_presentacion.dto';
import { CreatePromocionDto } from '../promocion-dtos/create-promocion.dto';
import { CreateProductoDto } from './create-producto.dto';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';

export class CreatePromocionAnidadaDto extends OmitType(CreatePromocionDto, [
  'producto_presentacion_id',
] as const) {}

export class CreateProductoPresentacionAnidadaDto extends OmitType(
  CreateProductoPresentacionDto,
  ['producto_id', 'imagen_url'] as const,
) {
  @ApiProperty({
    example: 'https://example.com/arroz-superior-1kg.jpg',
  })
  @IsNotEmpty()
  @IsString()
  @IsUrl()
  imagen_url!: string;

  @ApiPropertyOptional({
    type: () => CreatePromocionAnidadaDto,
    isArray: true,
    description: 'Promociones iniciales de esta presentación',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePromocionAnidadaDto)
  promociones?: CreatePromocionAnidadaDto[];
}

export class CreateProductoWithPresentacionesDto extends CreateProductoDto {
  @ApiProperty({
    type: () => CreateProductoPresentacionAnidadaDto,
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
  @ValidateNested({ each: true })
  @Type(() => CreateProductoPresentacionAnidadaDto)
  producto_presentaciones!: CreateProductoPresentacionAnidadaDto[];
}
