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
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateEmpresaDto } from '../../application/dto/empresa-dtos/create-empresa.dto';
import { ListEmpresasQueryDto } from '../../application/dto/empresa-dtos/list-empresas-query.dto';
import { UpdateEmpresaDto } from '../../application/dto/empresa-dtos/update-empresa.dto';
import { ChangeEmpresaStatusUseCase } from '../../application/use-cases/empresas/change-empresa-status.use-case';
import { CreateEmpresaUseCase } from '../../application/use-cases/empresas/create-empresa.use-case';
import { GetEmpresaByIdUseCase } from '../../application/use-cases/empresas/get-empresa-by-id.use-case';
import { ListEmpresasUseCase } from '../../application/use-cases/empresas/list-empresas.use-case';
import { UpdateEmpresaUseCase } from '../../application/use-cases/empresas/update-empresa.use-case';
import { EmpresaPresenter } from '../presenters/empresa.presenter';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';

@ApiTags('Empresas')
@ApiBearerAuth()
@Roles('admin')
@Controller('empresas')
export class EmpresasController {
  constructor(
    private readonly createEmpresa: CreateEmpresaUseCase,
    private readonly getEmpresaById: GetEmpresaByIdUseCase,
    private readonly listEmpresas: ListEmpresasUseCase,
    private readonly updateEmpresa: UpdateEmpresaUseCase,
    private readonly changeEmpresaStatus: ChangeEmpresaStatusUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear una empresa' })
  @ApiCreatedResponse({ description: 'Empresa creada correctamente' })
  async create(@Body() dto: CreateEmpresaDto) {
    return EmpresaPresenter.toHttp(await this.createEmpresa.execute(dto));
  }

  @Get()
  @ApiOperation({ summary: 'Listar empresas' })
  @ApiOkResponse({ description: 'Lista paginada de empresas' })
  async findAll(@Query() query: ListEmpresasQueryDto) {
    return EmpresaPresenter.paginatedToHttp(
      await this.listEmpresas.execute(query),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una empresa por ID' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return EmpresaPresenter.toHttp(await this.getEmpresaById.execute(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una empresa' })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmpresaDto,
  ) {
    return EmpresaPresenter.toHttp(await this.updateEmpresa.execute(id, dto));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar una empresa' })
  @ApiParam({ name: 'id', type: Number })
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return EmpresaPresenter.toHttp(
      await this.changeEmpresaStatus.execute(id, false),
    );
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reactivar una empresa' })
  @ApiParam({ name: 'id', type: Number })
  async activate(@Param('id', ParseIntPipe) id: number) {
    return EmpresaPresenter.toHttp(
      await this.changeEmpresaStatus.execute(id, true),
    );
  }
}
