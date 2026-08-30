import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateProductoPresentacionDto } from '../producto_presentacion-dtos/update-producto_presentacion.dto';
import { CreatePromocionAnidadaDto } from './create-producto-with-presentaciones.dto';
import { UpdateProductoDto } from './update-producto.dto';

export class UpsertPromocionAnidadaDto extends CreatePromocionAnidadaDto {
  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    description:
      'Omitir para crear; enviar para editar una promoción existente',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  id?: number;
}

export class UpdateProductoPresentacionAnidadaDto extends UpdateProductoPresentacionDto {
  @ApiProperty({ example: 5, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  id!: number;

  @ApiPropertyOptional({
    type: () => UpsertPromocionAnidadaDto,
    isArray: true,
    description: 'Promociones que se crearán o editarán en esta presentación',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertPromocionAnidadaDto)
  promociones?: UpsertPromocionAnidadaDto[];
}

export class UpdateProductoWithPresentacionesDto extends UpdateProductoDto {
  @ApiPropertyOptional({
    type: () => UpdateProductoPresentacionAnidadaDto,
    isArray: true,
    minItems: 1,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateProductoPresentacionAnidadaDto)
  producto_presentaciones?: UpdateProductoPresentacionAnidadaDto[];
}
