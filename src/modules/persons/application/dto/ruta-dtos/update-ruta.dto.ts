import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateRutaDto } from './create-ruta.dto';

export class UpdateRutaDto extends PartialType(
  OmitType(CreateRutaDto, ['estado', 'parent_id'] as const),
) {}
