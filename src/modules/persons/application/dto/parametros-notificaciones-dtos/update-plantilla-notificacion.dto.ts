import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePlantillaNotificacionDto {
  @ApiPropertyOptional({
    example: "Confirmamos el pago de tu pedido {{codigo}} — Franco's",
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  asunto?: string;

  @ApiPropertyOptional({
    example: '<p>Hola {{cliente}}, ...</p>',
    description:
      'HTML con placeholders {{variable}}; ver el campo "variables" de la plantilla para los nombres válidos.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  cuerpo?: string;
}
