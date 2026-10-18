import { PartialType, PickType } from '@nestjs/swagger';
import { CreateUsuarioInternoDto } from './create-usuario-interno.dto';

// El email no se edita (D7); estado y roles tienen sus propios endpoints.
export class UpdateUsuarioInternoDto extends PartialType(
  PickType(CreateUsuarioInternoDto, [
    'username',
    'nombres',
    'apellido_paterno',
    'apellido_materno',
    'contrasena',
  ] as const),
) {}
