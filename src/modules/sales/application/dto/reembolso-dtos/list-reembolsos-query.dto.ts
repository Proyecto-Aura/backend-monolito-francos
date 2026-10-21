import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { EstadoReembolso } from '../../../domain/enums';
import { PaginationQueryDto } from '../common/pagination-query.dto';

const FECHA_DIA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// RF-A040: filtros del listado de solicitudes de reembolso.
export class ListReembolsosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EstadoReembolso })
  @IsOptional()
  @IsEnum(EstadoReembolso)
  estado?: EstadoReembolso;

  @ApiPropertyOptional({
    example: '2026-10-01',
    description:
      'Fecha de solicitud desde (YYYY-MM-DD, hora de Lima), inclusive',
  })
  @IsOptional()
  @Matches(FECHA_DIA, {
    message: 'fecha_desde debe tener el formato YYYY-MM-DD',
  })
  fecha_desde?: string;

  @ApiPropertyOptional({
    example: '2026-10-31',
    description:
      'Fecha de solicitud hasta (YYYY-MM-DD, hora de Lima), inclusive',
  })
  @IsOptional()
  @Matches(FECHA_DIA, {
    message: 'fecha_hasta debe tener el formato YYYY-MM-DD',
  })
  fecha_hasta?: string;

  @ApiPropertyOptional({
    example: 'SOL-000001',
    description:
      'Código de la solicitud, código del pedido o nombre del cliente',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
