import { PartialType } from '@nestjs/swagger';
import { CreateIniciativaDto } from './create-iniciativa.dto';

export class UpdateIniciativaDto extends PartialType(CreateIniciativaDto) {}
