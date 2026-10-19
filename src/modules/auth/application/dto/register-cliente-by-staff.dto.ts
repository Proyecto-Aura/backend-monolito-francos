import { OmitType } from '@nestjs/swagger';
import { RegisterClienteDto } from './register-cliente.dto';

export class RegisterClienteByStaffDto extends OmitType(RegisterClienteDto, [
  'username',
  'password',
] as const) {}
