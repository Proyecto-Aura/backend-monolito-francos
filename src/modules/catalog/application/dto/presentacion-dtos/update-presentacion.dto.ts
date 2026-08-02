import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePresentacionDto } from './create-presentacion.dto';

export class UpdatePresentacionDto extends PartialType(
  OmitType(CreatePresentacionDto, ['estado'] as const),
) {}
