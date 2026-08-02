import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateEmpleadoDto } from '../../application/dto/empleado-dtos/create-empleado.dto';
import { ListEmpleadosQueryDto } from '../../application/dto/empleado-dtos/list-empleados-query.dto';
import { UpdateEmpleadoDto } from '../../application/dto/empleado-dtos/update-empleado.dto';
import {
  ChangeEmpleadoStatusUseCase,
  CreateEmpleadoUseCase,
  GetEmpleadoByIdUseCase,
  ListEmpleadosUseCase,
  UpdateEmpleadoUseCase,
} from '../../application/use-cases/empleados/empleados.use-cases';
import { EmpleadoPresenter } from '../presenters/empleado.presenter';

@ApiTags('Empleados')
@Controller('empleados')
export class EmpleadosController {
  constructor(
    private readonly createEmpleado: CreateEmpleadoUseCase,
    private readonly getEmpleado: GetEmpleadoByIdUseCase,
    private readonly listEmpleados: ListEmpleadosUseCase,
    private readonly updateEmpleado: UpdateEmpleadoUseCase,
    private readonly changeStatus: ChangeEmpleadoStatusUseCase,
  ) {}
  @Post() @ApiOperation({ summary: 'Crear un empleado' }) async create(
    @Body() dto: CreateEmpleadoDto,
  ) {
    return EmpleadoPresenter.toHttp(await this.createEmpleado.execute(dto));
  }
  @Get() @ApiOperation({ summary: 'Listar empleados' }) async findAll(
    @Query() query: ListEmpleadosQueryDto,
  ) {
    return EmpleadoPresenter.paginatedToHttp(
      await this.listEmpleados.execute(query),
    );
  }
  @Get(':id') @ApiParam({ name: 'id', format: 'uuid' }) async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return EmpleadoPresenter.toHttp(await this.getEmpleado.execute(id));
  }
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un empleado' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateEmpleadoDto,
  ) {
    return EmpleadoPresenter.toHttp(await this.updateEmpleado.execute(id, dto));
  }
  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un empleado' })
  async deactivate(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return EmpleadoPresenter.toHttp(await this.changeStatus.execute(id, false));
  }
  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reactivar un empleado' })
  async activate(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return EmpleadoPresenter.toHttp(await this.changeStatus.execute(id, true));
  }
}
