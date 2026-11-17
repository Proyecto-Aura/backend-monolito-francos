import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CategoriaCliente } from '../../../persons/domain/enums/persons.enums';
import { RegisterClienteDto } from './register-cliente.dto';

// Alta hecha por el personal: la categoría es opcional y, si no llega, el cliente
// queda como minorista (se puede cambiar luego al editarlo). En el autorregistro
// del portal (RegisterClienteDto) sigue siendo obligatoria.
export class RegisterClienteByStaffDto extends OmitType(RegisterClienteDto, [
  'username',
  'password',
  'categoria_cliente',
] as const) {
  @ApiPropertyOptional({
    enum: CategoriaCliente,
    default: CategoriaCliente.MINORISTA,
  })
  @IsOptional()
  @IsEnum(CategoriaCliente, {
    message: 'La categoría de cliente debe ser minorista o mayorista',
  })
  categoria_cliente?: CategoriaCliente;
}
