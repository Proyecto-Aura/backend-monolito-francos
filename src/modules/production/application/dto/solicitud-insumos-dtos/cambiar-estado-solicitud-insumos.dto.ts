import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { EstadoSolicitudInsumos } from '../../../domain/enums';

export class ItemCantidadEntregadaInsumoDto {
  @ApiProperty({ example: 5, description: 'insumo_id de la línea' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  insumo_id!: number;

  @ApiProperty({
    example: 8,
    minimum: 0.01,
    description:
      'Cantidad realmente entregada (puede diferir de lo solicitado)',
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  cantidad_entregada!: number;
}

export class CambiarEstadoSolicitudInsumosDto {
  @ApiProperty({ enum: EstadoSolicitudInsumos, example: 'en_proceso' })
  @IsNotEmpty()
  @IsEnum(EstadoSolicitudInsumos)
  estado!: EstadoSolicitudInsumos;

  // Solo aplica al pasar a 'entregado'. Si no se manda, se despacha
  // cantidad_solicitada de cada línea del detalle (comportamiento anterior).
  // Si se manda, debe cubrir exactamente las líneas del detalle (mismo
  // criterio que EntregarPedidoADespachoDto).
  @ApiProperty({
    type: () => ItemCantidadEntregadaInsumoDto,
    isArray: true,
    required: false,
    example: [{ insumo_id: 5, cantidad_entregada: 8 }],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemCantidadEntregadaInsumoDto)
  items?: ItemCantidadEntregadaInsumoDto[];
}
