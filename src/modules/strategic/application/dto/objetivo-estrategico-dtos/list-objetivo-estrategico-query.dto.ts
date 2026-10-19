import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../common/pagination-query-dto';

export class ListObjetivoEstrategicoQueryDto extends PaginationQueryDto {
  @ApiProperty({ type: Number, example: 1 })
  @Type(() => Number)
  @IsInt()
  plan_estrategico_id!: number;

  @ApiPropertyOptional({ type: Number, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  perspectiva_bsc_id?: number;

  @ApiPropertyOptional({ example: 'rentabilidad' })
  @IsOptional()
  @IsString()
  search?: string;
}
