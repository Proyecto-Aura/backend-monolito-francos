import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateInsumoDto } from './create-insumo.dto';

export class UpdateInsumoDto extends PartialType(
  OmitType(CreateInsumoDto, ['estado'] as const),
) {}
