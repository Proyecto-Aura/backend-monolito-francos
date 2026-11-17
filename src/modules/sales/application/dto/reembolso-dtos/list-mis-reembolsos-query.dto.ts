import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { EstadoReembolso } from '../../../domain/enums';
import { PaginationQueryDto } from '../common/pagination-query.dto';

// RF-B41: el cliente consulta sus solicitudes, opcionalmente por estado.
export class ListMisReembolsosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EstadoReembolso })
  @IsOptional()
  @IsEnum(EstadoReembolso)
  estado?: EstadoReembolso;
}
