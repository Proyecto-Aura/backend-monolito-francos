import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PlantillaNotificacionClave } from '../../domain/enums/persons.enums';
import { CanalNotificacionTipo } from '../../domain/enums/persons.enums';
import { UpdateCanalNotificacionDto } from '../../application/dto/parametros-notificaciones-dtos/update-canal-notificacion.dto';
import { UpdatePlantillaNotificacionDto } from '../../application/dto/parametros-notificaciones-dtos/update-plantilla-notificacion.dto';
import { GetPlantillaNotificacionByClaveUseCase } from '../../application/use-cases/parametros-notificaciones/get-plantilla-notificacion-by-clave.use-case';
import { ListCanalesNotificacionUseCase } from '../../application/use-cases/parametros-notificaciones/list-canales-notificacion.use-case';
import { ListPlantillasNotificacionUseCase } from '../../application/use-cases/parametros-notificaciones/list-plantillas-notificacion.use-case';
import { UpdateCanalNotificacionUseCase } from '../../application/use-cases/parametros-notificaciones/update-canal-notificacion.use-case';
import { UpdatePlantillaNotificacionUseCase } from '../../application/use-cases/parametros-notificaciones/update-plantilla-notificacion.use-case';
import { CanalNotificacionPresenter } from '../presenters/canal-notificacion.presenter';
import { PlantillaNotificacionPresenter } from '../presenters/plantilla-notificacion.presenter';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';

// FNC-43 (RF-A185 a RF-A188): gestión de canales y plantillas de
// notificaciones. Los canales y las plantillas se siembran en la migración;
// acá solo se consultan y se editan, nunca se crean ni se borran.
@ApiTags('Parámetros de notificaciones')
@ApiBearerAuth()
@Roles('admin')
@Controller('parametros-notificaciones')
export class ParametrosNotificacionesController {
  constructor(
    private readonly listCanales: ListCanalesNotificacionUseCase,
    private readonly updateCanal: UpdateCanalNotificacionUseCase,
    private readonly listPlantillas: ListPlantillasNotificacionUseCase,
    private readonly getPlantilla: GetPlantillaNotificacionByClaveUseCase,
    private readonly updatePlantilla: UpdatePlantillaNotificacionUseCase,
  ) {}

  @Get('canales')
  @ApiOperation({
    summary: 'Listar los canales de notificación (email, portal)',
  })
  @ApiOkResponse({ description: 'Los 2 canales existentes' })
  async findAllCanales() {
    return CanalNotificacionPresenter.listToHttp(
      await this.listCanales.execute(),
    );
  }

  @Patch('canales/:tipo')
  @ApiOperation({
    summary: 'Activar/desactivar un canal y editar su configuración',
  })
  @ApiParam({ name: 'tipo', enum: CanalNotificacionTipo })
  @ApiOkResponse({ description: 'Canal actualizado' })
  @ApiNotFoundResponse({ description: 'El canal no existe' })
  async updateOneCanal(
    @Param('tipo', new ParseEnumPipe(CanalNotificacionTipo))
    tipo: CanalNotificacionTipo,
    @Body() dto: UpdateCanalNotificacionDto,
  ) {
    return CanalNotificacionPresenter.toHttp(
      await this.updateCanal.execute(tipo, dto),
    );
  }

  @Get('plantillas')
  @ApiOperation({ summary: 'Listar las 11 plantillas de correo' })
  @ApiOkResponse({ description: 'Las 11 plantillas existentes' })
  async findAllPlantillas() {
    return PlantillaNotificacionPresenter.listToHttp(
      await this.listPlantillas.execute(),
    );
  }

  @Get('plantillas/:clave')
  @ApiOperation({ summary: 'Obtener una plantilla de correo por su clave' })
  @ApiParam({ name: 'clave', enum: PlantillaNotificacionClave })
  @ApiOkResponse({ description: 'La plantilla' })
  @ApiNotFoundResponse({ description: 'La plantilla no existe' })
  async findOnePlantilla(
    @Param('clave', new ParseEnumPipe(PlantillaNotificacionClave))
    clave: PlantillaNotificacionClave,
  ) {
    return PlantillaNotificacionPresenter.toHttp(
      await this.getPlantilla.execute(clave),
    );
  }

  @Patch('plantillas/:clave')
  @ApiOperation({ summary: 'Editar el asunto y/o el cuerpo de una plantilla' })
  @ApiParam({ name: 'clave', enum: PlantillaNotificacionClave })
  @ApiOkResponse({ description: 'Plantilla actualizada' })
  @ApiNotFoundResponse({ description: 'La plantilla no existe' })
  async updateOnePlantilla(
    @Param('clave', new ParseEnumPipe(PlantillaNotificacionClave))
    clave: PlantillaNotificacionClave,
    @Body() dto: UpdatePlantillaNotificacionDto,
  ) {
    return PlantillaNotificacionPresenter.toHttp(
      await this.updatePlantilla.execute(clave, dto),
    );
  }
}
