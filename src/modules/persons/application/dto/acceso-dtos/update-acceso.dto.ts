import { PartialType } from '@nestjs/swagger';
import { CreateAccesoDto } from './create-acceso.dto';

export class UpdateAccesoDto extends PartialType(CreateAccesoDto) {}
