import { CategoriaCliente, TipoCliente } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

// el ! le dice a nest "el campo es obligatorio, pero se asignará posteriormente."
export class CreateClienteDto {
  @IsUUID('4')
  persona_id!: string;

  @IsEnum(TipoCliente)
  tipo_cliente!: TipoCliente;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  razon_social?: string;

  @IsEnum(CategoriaCliente)
  categoria_cliente!: CategoriaCliente;

  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
