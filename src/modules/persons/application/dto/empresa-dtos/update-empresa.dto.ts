import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateEmpresaDto } from './create-empresa.dto';

export class UpdateEmpresaDto extends PartialType(
  OmitType(CreateEmpresaDto, ['estado'] as const),
) {}
