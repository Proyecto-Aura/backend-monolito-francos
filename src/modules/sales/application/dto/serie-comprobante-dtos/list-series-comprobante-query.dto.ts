import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { TipoComprobante } from '../../../domain/enums/sales.enums';
import { PaginationQueryDto } from '../common/pagination-query.dto';

const toBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (typeof value === 'boolean') return value;
  return String(value);
};

export class ListSeriesComprobanteQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TipoComprobante })
  @IsOptional()
  @IsEnum(TipoComprobante)
  tipo?: TipoComprobante;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  estado?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Activas con restantes <= umbral_alerta',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  por_agotar?: boolean;
}
