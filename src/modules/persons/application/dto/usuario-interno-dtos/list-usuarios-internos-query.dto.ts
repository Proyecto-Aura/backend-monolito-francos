import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../common/pagination-query.dto';

export class ListUsuariosInternosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Busca en nombres, apellidos, username y email',
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional({
    description: 'Nombre del rol (por ejemplo, ventas)',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  rol?: string;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (typeof value === 'boolean') return value;
    return String(value);
  })
  @IsBoolean()
  estado?: boolean;
}
