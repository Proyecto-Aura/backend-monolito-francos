import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../common/pagination-query-dto';

export class ListPlanEstrategicoQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '2026' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'BORRADOR',
    enum: ['BORRADOR', 'ACTIVO', 'CERRADO'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['BORRADOR', 'ACTIVO', 'CERRADO'])
  estado_codigo?: string;
}
