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
import { CreatePromocionDto } from '../../application/dto/promocion-dtos/create-promocion.dto';
import { ListPromocionQueryDto } from '../../application/dto/promocion-dtos/list-promocion-query.dto';
import { UpdatePromocionDto } from '../../application/dto/promocion-dtos/update-promocion.dto';
import { ChangePromocionStatusUseCase } from '../../application/use-cases/promocion/change-promocion-status.use-case';
import { CreatePromocionUseCase } from '../../application/use-cases/promocion/create-promocion.use-case';
import { GetPromocionByIdUseCase } from '../../application/use-cases/promocion/get-promocion-by-id.use-case';
import { ListPromocionesUseCase } from '../../application/use-cases/promocion/list-promociones.use-case';
import { UpdatePromocionUseCase } from '../../application/use-cases/promocion/update-promocion.use-case';
import { PromocionPresenter } from '../presenters/promocion.presenter';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';

@ApiTags('Promociones')
@ApiBearerAuth()
@Roles('admin', 'ventas')
@Controller('promociones')
export class PromocionesController {
  constructor(
    private readonly createPromocion: CreatePromocionUseCase,
    private readonly getPromocionById: GetPromocionByIdUseCase,
    private readonly listPromociones: ListPromocionesUseCase,
    private readonly updatePromocion: UpdatePromocionUseCase,
    private readonly changePromocionStatus: ChangePromocionStatusUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Crear una promoción de descuento por porcentaje',
    description:
      'Una presentación no puede tener dos promociones activas con fechas que se cruzan.',
  })
  @ApiCreatedResponse({ description: 'Promoción creada correctamente' })
  async create(@Body() dto: CreatePromocionDto) {
    return PromocionPresenter.toHttp(await this.createPromocion.execute(dto));
  }

  @Get()
  @ApiOperation({ summary: 'Listar promociones' })
  @ApiOkResponse({ description: 'Lista paginada de promociones' })
  async findAll(@Query() query: ListPromocionQueryDto) {
    return PromocionPresenter.paginatedToHttp(
      await this.listPromociones.execute(query),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una promoción por ID' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return PromocionPresenter.toHttp(await this.getPromocionById.execute(id));
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Actualizar el nombre, el porcentaje o las fechas de una promoción',
  })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePromocionDto,
  ) {
    return PromocionPresenter.toHttp(
      await this.updatePromocion.execute(id, dto),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar una promoción' })
  @ApiParam({ name: 'id', type: Number })
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return PromocionPresenter.toHttp(
      await this.changePromocionStatus.execute(id, false),
    );
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reactivar una promoción' })
  @ApiParam({ name: 'id', type: Number })
  async activate(@Param('id', ParseIntPipe) id: number) {
    return PromocionPresenter.toHttp(
      await this.changePromocionStatus.execute(id, true),
    );
  }
}
