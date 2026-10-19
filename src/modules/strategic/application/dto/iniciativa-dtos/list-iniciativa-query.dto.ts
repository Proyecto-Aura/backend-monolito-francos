import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../common/pagination-query-dto';

export class ListIniciativaQueryDto extends PaginationQueryDto {
  @ApiProperty({ type: Number, example: 1 })
  @Type(() => Number)
  @IsInt()
  objetivo_estrategico_id!: number;

  @ApiPropertyOptional({ example: 'fidelización' })
  @IsOptional()
  @IsString()
  search?: string;
}
