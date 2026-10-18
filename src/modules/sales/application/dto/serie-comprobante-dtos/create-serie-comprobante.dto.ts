import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { CORRELATIVO_MAXIMO } from '../../../domain/entities/serie-comprobante.entity';
import { TipoComprobante } from '../../../domain/enums/sales.enums';

export class CreateSerieComprobanteDto {
  @ApiProperty({ enum: TipoComprobante, example: TipoComprobante.BOLETA })
  @IsEnum(TipoComprobante)
  tipo!: TipoComprobante;

  @ApiProperty({
    description: 'Código SUNAT: B### para boleta, F### para factura',
    example: 'B001',
    pattern: '^[BF][A-Z0-9]{3}$',
  })
  @Matches(/^[BF][A-Z0-9]{3}$/, {
    message:
      'serie debe tener 4 caracteres: B o F seguida de 3 letras mayúsculas o dígitos',
  })
  serie!: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: CORRELATIVO_MAXIMO })
  @IsInt()
  @Min(1)
  @Max(CORRELATIVO_MAXIMO)
  correlativo_inicio!: number;

  @ApiProperty({ example: 99999999, minimum: 1, maximum: CORRELATIVO_MAXIMO })
  @IsInt()
  @Min(1)
  @Max(CORRELATIVO_MAXIMO)
  correlativo_fin!: number;

  @ApiPropertyOptional({
    description: 'Restantes a partir de los que la serie está por agotarse',
    default: 100,
    minimum: 0,
  })
  // Omitido toma el valor por defecto; `null` explícito es un 400.
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(CORRELATIVO_MAXIMO)
  umbral_alerta?: number;

  @ApiPropertyOptional({
    description: 'Solo puede haber una serie activa por tipo',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
