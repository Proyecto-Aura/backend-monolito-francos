import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UpsertEmpresaEmisoraDto } from '../../application/dto/empresa-dtos/upsert-empresa-emisora.dto';
import { GetEmpresaEmisoraUseCase } from '../../application/use-cases/empresas/get-empresa-emisora.use-case';
import { QuitarLogoEmpresaEmisoraUseCase } from '../../application/use-cases/empresas/quitar-logo-empresa-emisora.use-case';
import { SubirLogoEmpresaEmisoraUseCase } from '../../application/use-cases/empresas/subir-logo-empresa-emisora.use-case';
import { UpsertEmpresaEmisoraUseCase } from '../../application/use-cases/empresas/upsert-empresa-emisora.use-case';
import { EmpresaPresenter } from '../presenters/empresa.presenter';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';

const LIMITE_MULTER_LOGO = 5 * 1024 * 1024;

// HU-A-039: datos de la empresa emisora de los comprobantes (registro único).
@ApiTags('Empresa emisora')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
@ApiForbiddenResponse({ description: 'El usuario no tiene el rol admin' })
@Roles('admin')
@Controller('empresa')
export class EmpresaEmisoraController {
  constructor(
    private readonly getEmpresaEmisora: GetEmpresaEmisoraUseCase,
    private readonly upsertEmpresaEmisora: UpsertEmpresaEmisoraUseCase,
    private readonly subirLogoEmpresaEmisora: SubirLogoEmpresaEmisoraUseCase,
    private readonly quitarLogoEmpresaEmisora: QuitarLogoEmpresaEmisoraUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtener los datos de la empresa emisora' })
  @ApiOkResponse({ description: 'Datos vigentes de la empresa emisora' })
  @ApiNotFoundResponse({ description: 'Empresa emisora no configurada' })
  async findEmisora() {
    return EmpresaPresenter.toHttp(await this.getEmpresaEmisora.execute());
  }

  @Put()
  @ApiOperation({
    summary: 'Registrar o reemplazar los datos de la empresa emisora',
  })
  @ApiOkResponse({ description: 'Empresa emisora registrada o actualizada' })
  @ApiBadRequestResponse({ description: 'Datos de entrada inválidos' })
  @ApiConflictResponse({
    description: 'El RUC o el email pertenecen a otra empresa',
  })
  async upsert(@Body() dto: UpsertEmpresaEmisoraDto) {
    return EmpresaPresenter.toHttp(
      await this.upsertEmpresaEmisora.execute(dto),
    );
  }

  // El límite de multer es un tope de memoria; el de 1 MB lo valida el use-case
  // para responder 400 con mensaje en español en vez del 413 de multer.
  @Post('logo')
  @UseInterceptors(
    FileInterceptor('logo', { limits: { fileSize: LIMITE_MULTER_LOGO } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { logo: { type: 'string', format: 'binary' } },
      required: ['logo'],
    },
  })
  @ApiOperation({
    summary:
      'Subir o reemplazar el logo de la empresa emisora (PNG o JPG, 1 MB)',
  })
  @ApiOkResponse({ description: 'Empresa emisora con el logo_url nuevo' })
  @ApiBadRequestResponse({
    description: 'Falta el archivo o no es PNG/JPG de hasta 1 MB',
  })
  @ApiNotFoundResponse({ description: 'Empresa emisora no configurada' })
  async subirLogo(
    @UploadedFile(
      new ParseFilePipeBuilder().build({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    logo: Express.Multer.File,
  ) {
    return EmpresaPresenter.toHttp(
      await this.subirLogoEmpresaEmisora.execute(logo),
    );
  }

  @Delete('logo')
  @ApiOperation({ summary: 'Quitar el logo de la empresa emisora' })
  @ApiOkResponse({ description: 'Empresa emisora sin logo (logo_url null)' })
  @ApiNotFoundResponse({ description: 'Empresa emisora no configurada' })
  async quitarLogo() {
    return EmpresaPresenter.toHttp(
      await this.quitarLogoEmpresaEmisora.execute(),
    );
  }
}
