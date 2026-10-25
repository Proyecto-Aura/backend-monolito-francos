import { OmitType } from '@nestjs/swagger';
import { CreateEmpresaDto } from './create-empresa.dto';

// PUT /empresa reemplaza los datos de la emisora: mismas reglas que el alta,
// sin `estado` (la emisora siempre está activa) y sin `logo_url`: el logo se
// maneja solo con POST /empresa/logo y DELETE /empresa/logo, así guardar los
// datos nunca lo pisa.
export class UpsertEmpresaEmisoraDto extends OmitType(CreateEmpresaDto, [
  'estado',
  'logo_url',
] as const) {}
