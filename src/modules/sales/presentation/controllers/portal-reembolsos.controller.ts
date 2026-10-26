import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../../auth/presentation/strategies/jwt.strategy';
import { ListMisReembolsosQueryDto } from '../../application/dto/reembolso-dtos/list-mis-reembolsos-query.dto';
import { SolicitarReembolsoDto } from '../../application/dto/reembolso-dtos/solicitar-reembolso.dto';
import { GetMiReembolsoUseCase } from '../../application/use-cases/reembolso/get-mi-reembolso.use-case';
import { ListMisReembolsosUseCase } from '../../application/use-cases/reembolso/list-mis-reembolsos.use-case';
import { SolicitarReembolsoUseCase } from '../../application/use-cases/reembolso/solicitar-reembolso.use-case';
import { ReembolsoPortalPresenter } from '../presenters/reembolso-portal.presenter';

// La evidencia admitida: PDF o imagen, hasta 5 MB (se responde 400 si no cumple).
const TIPOS_EVIDENCIA = /^(application\/pdf|image\/(jpeg|png|webp))$/;
const TAMANO_MAXIMO_EVIDENCIA = 5 * 1024 * 1024;
// S3Service carga el archivo completo en memoria: multer corta mucho antes de
// que un archivo enorme llegue a la validación (413 por encima de este tope).
const TOPE_MULTER = 2 * TAMANO_MAXIMO_EVIDENCIA;

@ApiTags('Portal - Reembolsos')
@ApiBearerAuth()
@Roles('cliente')
@Controller('portal/reembolsos')
export class PortalReembolsosController {
  constructor(
    private readonly solicitarReembolso: SolicitarReembolsoUseCase,
    private readonly listMisReembolsos: ListMisReembolsosUseCase,
    private readonly getMiReembolso: GetMiReembolsoUseCase,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('evidencia', {
      limits: { fileSize: TOPE_MULTER },
      // Nombres con tildes (acta de recepción.pdf) llegan en UTF-8.
      defParamCharset: 'utf8',
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        pedido_id: { type: 'number', example: 12 },
        motivo: { type: 'string', example: 'Producto en mal estado' },
        descripcion: {
          type: 'string',
          example: 'Llegaron 4 packs de canchita con la bolsa rota.',
        },
        evidencia: { type: 'string', format: 'binary' },
      },
      required: ['pedido_id', 'motivo', 'descripcion', 'evidencia'],
    },
  })
  @ApiOperation({
    summary: 'Solicitar el reembolso de un pedido propio',
    description:
      'Solo para un pedido pagado en estado entregado, confirmado o cancelado y sin otra solicitud (RF-B38 a RF-B40). La evidencia es obligatoria: PDF, JPG, PNG o WEBP de hasta 5 MB. La solicitud nace pendiente con el monto del pago.',
  })
  @ApiCreatedResponse({ description: 'Solicitud registrada en pendiente' })
  @ApiBadRequestResponse({
    description:
      'Falta el motivo, la descripción (mínimo 10 caracteres) o la evidencia, o la evidencia no es de un tipo o tamaño admitido',
  })
  @ApiNotFoundResponse({
    description: 'El usuario no tiene un cliente o el pedido no es suyo',
  })
  @ApiConflictResponse({
    description:
      'El cliente está inactivo, el pedido no tiene pago, no está en un estado reembolsable o ya tiene una solicitud',
  })
  async solicitar(
    @Body() dto: SolicitarReembolsoDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: TIPOS_EVIDENCIA })
        .addMaxSizeValidator({ maxSize: TAMANO_MAXIMO_EVIDENCIA })
        .build({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    evidencia: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // El validador mira el contenido, pero S3 sirve el archivo con el tipo que
    // declara el cliente: una imagen real enviada como text/html no debe pasar.
    if (!TIPOS_EVIDENCIA.test(evidencia.mimetype)) {
      throw new BadRequestException(
        'El tipo declarado de la evidencia no es PDF, JPG, PNG ni WEBP',
      );
    }

    return ReembolsoPortalPresenter.detalleToHttp(
      await this.solicitarReembolso.execute(
        dto,
        {
          nombre: evidencia.originalname,
          tipo: evidencia.mimetype,
          contenido: evidencia.buffer,
        },
        user.userId,
      ),
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Listar mis solicitudes de reembolso',
    description:
      'Solo las del cliente que inició sesión, las más recientes primero. Filtra por estado (RF-B41).',
  })
  @ApiOkResponse({ description: 'Lista paginada de mis solicitudes' })
  @ApiBadRequestResponse({ description: 'Filtro inválido' })
  @ApiNotFoundResponse({ description: 'El usuario no tiene un cliente' })
  async findAll(
    @Query() query: ListMisReembolsosQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return ReembolsoPortalPresenter.paginatedToHttp(
      await this.listMisReembolsos.execute(query, user.userId),
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Ver el detalle de mi solicitud de reembolso',
    description:
      'Incluye el estado, el motivo del rechazo si lo hay y la evidencia con un enlace que vence a los 5 minutos (RF-B41).',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Solicitud con su pedido, estado y evidencia' })
  @ApiNotFoundResponse({
    description: 'La solicitud no existe o es de otro cliente',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return ReembolsoPortalPresenter.detalleToHttp(
      await this.getMiReembolso.execute(id, user.userId),
    );
  }
}
