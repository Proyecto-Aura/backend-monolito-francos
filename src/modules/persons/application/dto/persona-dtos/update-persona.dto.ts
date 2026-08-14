import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePersonaDto } from './create-persona.dto';

export class UpdatePersonaDto extends PartialType(
  OmitType(CreatePersonaDto, ['estado'] as const),
) {}
