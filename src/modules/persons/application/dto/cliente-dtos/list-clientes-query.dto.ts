import { Transform } from 'class-transformer';
import { CategoriaCliente, TipoCliente } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../common/pagination-query.dto';

export class ListClientesQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : String(value),
  )
  @IsBoolean()
  estado?: boolean;
  @IsOptional() @IsEnum(TipoCliente) tipo_cliente?: TipoCliente;
  @IsOptional() @IsEnum(CategoriaCliente) categoria_cliente?: CategoriaCliente;
}
