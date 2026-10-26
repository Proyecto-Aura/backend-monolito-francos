import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { IsRuc } from '../../../../../common/validators/ruc.validator';
import { TipoComprobante } from '../../../domain/enums';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const esFactura = (dto: DatosComprobanteDto) =>
  dto.tipo_comprobante === TipoComprobante.FACTURA;

// HU-B-009 (RF-B29): el cliente elige boleta o factura. Con factura, RUC y
// razón social son obligatorios; con boleta se ignoran. Se reutiliza al crear
// el pedido con el pago (HU-B-008).
export class DatosComprobanteDto {
  @ApiPropertyOptional({
    enum: TipoComprobante,
    default: TipoComprobante.BOLETA,
  })
  @IsOptional()
  @IsEnum(TipoComprobante)
  tipo_comprobante?: TipoComprobante;

  @ApiPropertyOptional({
    example: '20601234565',
    description:
      'Obligatorio con factura: 11 dígitos, prefijo 10/15/17/20 y dígito verificador',
  })
  @ValidateIf(esFactura)
  @IsString()
  @IsRuc()
  ruc?: string;

  @ApiPropertyOptional({
    example: 'Distribuidora Andina S.A.C.',
    maxLength: 200,
    description: 'Obligatoria con factura',
  })
  @ValidateIf(esFactura)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  razon_social?: string;
}
