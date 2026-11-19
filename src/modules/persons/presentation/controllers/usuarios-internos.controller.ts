import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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
import { CreateUsuarioInternoDto } from '../../application/dto/usuario-interno-dtos/create-usuario-interno.dto';
import { ListUsuariosInternosQueryDto } from '../../application/dto/usuario-interno-dtos/list-usuarios-internos-query.dto';
import { SetRolesUsuarioInternoDto } from '../../application/dto/usuario-interno-dtos/set-roles-usuario-interno.dto';
import { UpdateUsuarioInternoDto } from '../../application/dto/usuario-interno-dtos/update-usuario-interno.dto';
import { ChangeUsuarioInternoStatusUseCase } from '../../application/use-cases/usuarios-internos/change-usuario-interno-status.use-case';
import { CreateUsuarioInternoUseCase } from '../../application/use-cases/usuarios-internos/create-usuario-interno.use-case';
import { GetUsuarioInternoByIdUseCase } from '../../application/use-cases/usuarios-internos/get-usuario-interno-by-id.use-case';
import { ListUsuariosInternosUseCase } from '../../application/use-cases/usuarios-internos/list-usuarios-internos.use-case';
import { QuitarFotoUsuarioInternoUseCase } from '../../application/use-cases/usuarios-internos/quitar-foto-usuario-interno.use-case';
import { SetUsuarioInternoRolesUseCase } from '../../application/use-cases/usuarios-internos/set-usuario-interno-roles.use-case';
import { SubirFotoUsuarioInternoUseCase } from '../../application/use-cases/usuarios-internos/subir-foto-usuario-interno.use-case';
import { UpdateUsuarioInternoUseCase } from '../../application/use-cases/usuarios-internos/update-usuario-interno.use-case';
import { UsuarioInternoPresenter } from '../presenters/usuario-interno.presenter';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../auth/presentation/strategies/jwt.strategy';

const LIMITE_MULTER_FOTO_USUARIO = 5 * 1024 * 1024;

@ApiTags('Usuarios')
@ApiBearerAuth()
@Roles('admin')
@Controller('usuarios')
export class UsuariosInternosController {
  constructor(
    private readonly createUsuario: CreateUsuarioInternoUseCase,
    private readonly listUsuarios: ListUsuariosInternosUseCase,
    private readonly getUsuario: GetUsuarioInternoByIdUseCase,
    private readonly updateUsuario: UpdateUsuarioInternoUseCase,
    private readonly changeStatus: ChangeUsuarioInternoStatusUseCase,
    private readonly setRoles: SetUsuarioInternoRolesUseCase,
    private readonly subirFoto: SubirFotoUsuarioInternoUseCase,
    private readonly quitarFoto: QuitarFotoUsuarioInternoUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Crear un usuario interno con credenciales elegidas por el admin',
  })
  @ApiCreatedResponse({ description: 'Usuario interno creado' })
  @ApiNotFoundResponse({ description: 'Algún rol no existe' })
  @ApiConflictResponse({
    description:
      'Documento, email o username duplicado; rol inactivo o rol cliente',
  })
  async create(@Body() dto: CreateUsuarioInternoDto) {
    return UsuarioInternoPresenter.toHttp(
      await this.createUsuario.execute(dto),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar usuarios internos (excluye clientes)' })
  @ApiOkResponse({ description: 'Lista paginada de usuarios internos' })
  async findAll(@Query() query: ListUsuariosInternosQueryDto) {
    return UsuarioInternoPresenter.paginatedToHttp(
      await this.listUsuarios.execute(query),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un usuario interno por ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNotFoundResponse({ description: 'No existe o no es usuario interno' })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return UsuarioInternoPresenter.toHttp(await this.getUsuario.execute(id));
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Actualizar username, nombres, apellidos o contraseña de un usuario interno',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiConflictResponse({ description: 'Username duplicado' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateUsuarioInternoDto,
  ) {
    return UsuarioInternoPresenter.toHttp(
      await this.updateUsuario.execute(id, dto),
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Desactivar un usuario interno (revoca sus refresh tokens)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiConflictResponse({
    description: 'Desactivarse a sí mismo o al último admin activo',
  })
  async deactivate(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return UsuarioInternoPresenter.toHttp(
      await this.changeStatus.execute(id, false, currentUser.userId),
    );
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reactivar un usuario interno' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async activate(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return UsuarioInternoPresenter.toHttp(
      await this.changeStatus.execute(id, true, currentUser.userId),
    );
  }

  @Put(':id/roles')
  @ApiOperation({ summary: 'Reemplazar los roles de un usuario interno' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiConflictResponse({
    description:
      'Rol inactivo o cliente; quitarse admin a sí mismo o al último admin activo',
  })
  async replaceRoles(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: SetRolesUsuarioInternoDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return UsuarioInternoPresenter.toHttp(
      await this.setRoles.execute(id, dto, currentUser.userId),
    );
  }

  // El límite de multer es un tope de memoria; el de 1 MB lo valida el use-case
  // para responder 400 con mensaje en español en vez del 413 de multer.
  @Post(':id/foto')
  @UseInterceptors(
    FileInterceptor('foto', {
      limits: { fileSize: LIMITE_MULTER_FOTO_USUARIO },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { foto: { type: 'string', format: 'binary' } },
      required: ['foto'],
    },
  })
  @ApiOperation({
    summary:
      'Subir o reemplazar la foto de perfil de un usuario (PNG o JPG, 1 MB)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Usuario interno con el foto_url nuevo' })
  @ApiBadRequestResponse({
    description: 'Falta el archivo o no es PNG/JPG de hasta 1 MB',
  })
  @ApiNotFoundResponse({ description: 'No existe o no es usuario interno' })
  async subirFotoUsuario(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @UploadedFile(
      new ParseFilePipeBuilder().build({
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    foto: Express.Multer.File,
  ) {
    return UsuarioInternoPresenter.toHttp(
      await this.subirFoto.execute(id, foto),
    );
  }

  @Delete(':id/foto')
  @ApiOperation({ summary: 'Quitar la foto de perfil de un usuario' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Usuario interno sin foto (foto_url null)' })
  @ApiNotFoundResponse({ description: 'No existe o no es usuario interno' })
  async quitarFotoUsuario(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return UsuarioInternoPresenter.toHttp(await this.quitarFoto.execute(id));
  }
}
