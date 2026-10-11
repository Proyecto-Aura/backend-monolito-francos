import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../common/pagination-query-dto';

export class ListDocumentoEstrategicoQueryDto extends PaginationQueryDto {
  @ApiProperty({ type: Number, example: 1 })
  @Type(() => Number)
  @IsInt()
  plan_estrategico_id!: number;

  @ApiPropertyOptional({ example: 'diagnóstico' })
  @IsOptional()
  @IsString()
  search?: string;
}
