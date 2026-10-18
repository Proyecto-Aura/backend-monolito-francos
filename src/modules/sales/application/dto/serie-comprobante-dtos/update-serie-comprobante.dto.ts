import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateSerieComprobanteDto } from './create-serie-comprobante.dto';

// El estado tiene sus propios endpoints. Si la serie ya emitió, solo se puede
// ampliar `correlativo_fin` y cambiar `umbral_alerta` (lo valida el caso de uso).
// `skipNullProperties: false`: un campo omitido no se valida, pero un `null`
// explícito sí (y responde 400 en vez de llegar a Prisma).
export class UpdateSerieComprobanteDto extends PartialType(
  OmitType(CreateSerieComprobanteDto, ['estado'] as const),
  { skipNullProperties: false },
) {}
