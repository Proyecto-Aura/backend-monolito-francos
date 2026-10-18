import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { UpsertEmpresaEmisoraUseCase } from '../../application/use-cases/empresas/upsert-empresa-emisora.use-case';
import { EmpresaPresenter } from '../presenters/empresa.presenter';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';

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
}
