import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePromocionDto } from './create-promocion.dto';

export class UpdatePromocionDto extends PartialType(
  OmitType(CreatePromocionDto, ['estado'] as const),
) {}
