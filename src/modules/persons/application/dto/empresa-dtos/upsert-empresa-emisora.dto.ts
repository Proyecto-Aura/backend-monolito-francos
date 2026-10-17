import { OmitType } from '@nestjs/swagger';
import { CreateEmpresaDto } from './create-empresa.dto';

// PUT /empresa reemplaza los datos de la emisora: mismas reglas que el alta,
// sin `estado` (la emisora siempre está activa).
export class UpsertEmpresaEmisoraDto extends OmitType(CreateEmpresaDto, [
  'estado',
] as const) {}
