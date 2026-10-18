import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

// RF-A043: rechazar exige registrar el motivo.
export class RechazarReembolsoDto {
  @ApiProperty({
    example:
      'La solicitud excede el plazo de 48 horas establecido en las condiciones de venta.',
    maxLength: 1000,
  })
  @IsString()
  @MaxLength(1000)
  motivo_rechazo: string;
}
