import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ActualizarPreferenciasNotificacionDto {
  @ApiProperty({
    type: Boolean,
    description: 'Recibir el aviso cuando el pedido sale a reparto',
  })
  @IsBoolean()
  pedido_en_camino!: boolean;
}
