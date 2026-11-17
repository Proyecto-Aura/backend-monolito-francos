import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ResumenPedidoPortalDto } from './resumen-pedido-portal.dto';

// HU-B-008 (RF-B24): el cliente paga su carrito. Lleva lo mismo que el resumen,
// que ya se mostró antes de pagar (RF-B25), más el token del checkout de Culqi.
// El comprobante elegido (HU-B-009) viaja aquí: con el pago confirmado se emite
// la boleta o factura (HU-B-010).
export class CrearPedidoPortalDto extends ResumenPedidoPortalDto {
  @ApiProperty({
    example: 'tkn_test_0CjjdWhFpEAZlxlz',
    maxLength: 100,
    description:
      'Token que devuelve el checkout de Culqi (tarjeta, Yape o Plin). Con la pasarela simulada: tkn_sim_ok_* aprueba y tkn_sim_ko_* rechaza',
  })
  @IsString({ message: 'El token de pago debe ser texto' })
  @MaxLength(100, {
    message: 'El token de pago no puede pasar de 100 caracteres',
  })
  @IsNotEmpty({ message: 'Falta el token de pago' })
  culqi_token: string;
}
