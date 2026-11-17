import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TipoEntrega } from '../../../domain/enums';
import { DatosComprobanteDto } from './datos-comprobante.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ResumenPedidoPortalItemDto {
  @ApiProperty({ example: 10, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  producto_presentacion_id: number;

  @ApiProperty({ example: 30, minimum: 1, maximum: 100000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  cantidad: number;
}

// HU-B-007: el cliente confirma su carrito y el servidor recalcula el resumen.
// El cliente sale del JWT: el body no trae cliente_id.
export class ResumenPedidoPortalDto {
  @ApiProperty({ type: [ResumenPedidoPortalItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique(
    (item: ResumenPedidoPortalItemDto) => item.producto_presentacion_id,
    {
      message:
        'Cada presentación debe aparecer una sola vez; ajusta su cantidad en lugar de repetirla',
    },
  )
  @ValidateNested({ each: true })
  @Type(() => ResumenPedidoPortalItemDto)
  items: ResumenPedidoPortalItemDto[];

  @ApiProperty({ enum: TipoEntrega, example: TipoEntrega.DELIVERY })
  @IsEnum(TipoEntrega)
  tipo_entrega: TipoEntrega;

  @ApiPropertyOptional({
    example: 'Av. La Marina 1450, San Miguel',
    maxLength: 255,
    description:
      'Dirección solo para este pedido; si no viene, se usa la del perfil. Se ignora en recojo en tienda',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  direccion_entrega?: string;

  @ApiPropertyOptional({
    type: DatosComprobanteDto,
    description: 'Tipo de comprobante (HU-B-009); si no viene, boleta',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DatosComprobanteDto)
  comprobante?: DatosComprobanteDto;
}
