import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../common/pagination-query.dto';

export class ListNotificacionesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  leido?: boolean;
}
