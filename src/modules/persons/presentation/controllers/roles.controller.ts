import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateRolDto } from '../../application/dto/rol-dtos/create-rol.dto';
import { ListRolesQueryDto } from '../../application/dto/rol-dtos/list-roles-query.dto';
import { UpdateRolDto } from '../../application/dto/rol-dtos/update-rol.dto';
import { ChangeRolStatusUseCase } from '../../application/use-cases/roles/change-rol-status.use-case';
import { CreateRolUseCase } from '../../application/use-cases/roles/create-rol.use-case';
import { GetRolByIdUseCase } from '../../application/use-cases/roles/get-rol-by-id.use-case';
import { ListRolesUseCase } from '../../application/use-cases/roles/list-roles.use-case';
import { UpdateRolUseCase } from '../../application/use-cases/roles/update-rol.use-case';
import { RolPresenter } from '../presenters/rol.presenter';

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  constructor(
    private readonly createRol: CreateRolUseCase,
    private readonly getRolById: GetRolByIdUseCase,
    private readonly listRoles: ListRolesUseCase,
    private readonly updateRol: UpdateRolUseCase,
    private readonly changeRolStatus: ChangeRolStatusUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear un rol' })
  @ApiCreatedResponse({ description: 'Rol creado correctamente' })
  async create(@Body() dto: CreateRolDto) {
    return RolPresenter.toHttp(await this.createRol.execute(dto));
  }

  @Get()
  @ApiOperation({ summary: 'Listar roles' })
  @ApiOkResponse({ description: 'Lista paginada de roles' })
  async findAll(@Query() query: ListRolesQueryDto) {
    return RolPresenter.paginatedToHttp(await this.listRoles.execute(query));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un rol por ID' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return RolPresenter.toHttp(await this.getRolById.execute(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar los datos de un rol' })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRolDto,
  ) {
    return RolPresenter.toHttp(await this.updateRol.execute(id, dto));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un rol' })
  @ApiParam({ name: 'id', type: Number })
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return RolPresenter.toHttp(await this.changeRolStatus.execute(id, false));
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reactivar un rol' })
  @ApiParam({ name: 'id', type: Number })
  async activate(@Param('id', ParseIntPipe) id: number) {
    return RolPresenter.toHttp(await this.changeRolStatus.execute(id, true));
  }
}
