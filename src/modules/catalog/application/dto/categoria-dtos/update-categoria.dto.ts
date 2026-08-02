import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateCategoriaDto } from './create-categoria.dto';

export class UpdateCategoriaDto extends PartialType(
  OmitType(CreateCategoriaDto, ['estado'] as const),
) {}
