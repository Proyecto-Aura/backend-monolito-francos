import { CategoriaCliente, TipoCliente } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateClienteDto {
  @IsOptional()
  @IsEnum(TipoCliente)
  tipo_cliente?: TipoCliente;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  razon_social?: string;

  @IsOptional()
  @IsEnum(CategoriaCliente)
  categoria_cliente?: CategoriaCliente;
}
