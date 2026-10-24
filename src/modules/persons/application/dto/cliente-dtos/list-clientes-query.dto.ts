import { Transform } from 'class-transformer';
import { CategoriaCliente, TipoCliente } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
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
  @IsOptional()
  @Matches(/^\d{2}$/, { message: 'departamento_id debe tener 2 dígitos' })
  departamento_id?: string;
  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'provincia_id debe tener 4 dígitos' })
  provincia_id?: string;
  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'distrito_id debe tener 6 dígitos' })
  distrito_id?: string;
}
