import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../common/pagination-query-dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListProductoPresentacionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'FR-P1-PR1', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : String(value),
  )
  @IsBoolean()
  estado?: boolean;
}
