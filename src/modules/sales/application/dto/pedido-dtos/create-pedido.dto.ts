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
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { MetodoPago, TipoEntrega } from '../../../domain/enums';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreatePedidoItemDto {
  @ApiProperty({ example: 10, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  producto_presentacion_id: number;

  @ApiProperty({ example: 24, minimum: 1, maximum: 100000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  cantidad: number;
}

// RF-A032: registro manual de un pedido por el trabajador de ventas.
export class CreatePedidoDto {
  @ApiProperty({
    format: 'uuid',
    example: '6f1c2b0e-9a4d-4f43-9a51-2b7d1c0e8f11',
  })
  @IsUUID()
  cliente_id: string;

  @ApiProperty({ type: [CreatePedidoItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique((item: CreatePedidoItemDto) => item.producto_presentacion_id, {
    message:
      'Cada presentación debe aparecer una sola vez; ajusta su cantidad en lugar de repetirla',
  })
  @ValidateNested({ each: true })
  @Type(() => CreatePedidoItemDto)
  items: CreatePedidoItemDto[];

  @ApiProperty({ enum: TipoEntrega, example: TipoEntrega.DELIVERY })
  @IsEnum(TipoEntrega)
  tipo_entrega: TipoEntrega;

  @ApiPropertyOptional({
    example: 'Av. La Marina 1450, San Miguel',
    maxLength: 255,
    description: 'Obligatoria para delivery; se ignora en recojo en tienda',
  })
  @ValidateIf(
    (dto: CreatePedidoDto) => dto.tipo_entrega === TipoEntrega.DELIVERY,
  )
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  direccion_entrega?: string;

  @ApiProperty({ enum: MetodoPago, example: MetodoPago.CULQI })
  @IsEnum(MetodoPago)
  metodo_pago: MetodoPago;

  @ApiPropertyOptional({
    example: 'tkn_test_0CjjdWhFpEAZlxlz',
    maxLength: 100,
    description:
      'Token que devuelve el checkout de Culqi; obligatorio si el método es culqi',
  })
  @ValidateIf((dto: CreatePedidoDto) => dto.metodo_pago === MetodoPago.CULQI)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  culqi_token?: string;
}
