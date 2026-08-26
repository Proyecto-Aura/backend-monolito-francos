import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ListClientesQueryDto } from '../../application/dto/cliente-dtos/list-clientes-query.dto';
import { UpdateClienteDto } from '../../application/dto/cliente-dtos/update-cliente.dto';
import { ChangeClienteStatusUseCase } from '../../application/use-cases/clientes/change-cliente-status.use-case';
import { GetClienteByIdUseCase } from '../../application/use-cases/clientes/get-cliente-by-id.use-case';
import { ListClientesUseCase } from '../../application/use-cases/clientes/list-cliente.use-case';
import { UpdateClienteUseCase } from '../../application/use-cases/clientes/update-cliente.use-case';
import { ClientePresenter } from '../presenters/cliente.presenter';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/presentation/guards/roles.guard';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';

@ApiTags('Clientes')
@Controller('clientes')
export class ClientesController {
  constructor(
    private readonly getCliente: GetClienteByIdUseCase,
    private readonly listClientes: ListClientesUseCase,
    private readonly updateCliente: UpdateClienteUseCase,
    private readonly changeStatus: ChangeClienteStatusUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes' })
  async findAll(@Query() query: ListClientesQueryDto) {
    return ClientePresenter.paginatedToHttp(
      await this.listClientes.execute(query),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un cliente por ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return ClientePresenter.toHttp(await this.getCliente.execute(id));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'ventas')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar un cliente (y sus datos de persona)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateClienteDto,
  ) {
    return ClientePresenter.toHttp(await this.updateCliente.execute(id, dto));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'ventas')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desactivar un cliente' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async deactivate(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return ClientePresenter.toHttp(await this.changeStatus.execute(id, false));
  }

  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'ventas')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivar un cliente' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async activate(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return ClientePresenter.toHttp(await this.changeStatus.execute(id, true));
  }
}
