import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import { UpdateParametroVentaDto } from '../../application/dto/parametro-venta-dtos/update-parametro-venta.dto';
import { GetParametroVentaUseCase } from '../../application/use-cases/parametro-venta/get-parametro-venta.use-case';
import { UpdateParametroVentaUseCase } from '../../application/use-cases/parametro-venta/update-parametro-venta.use-case';
import { ParametroVentaPresenter } from '../presenters/parametro-venta.presenter';

@ApiTags('Parámetros de ventas')
@ApiBearerAuth()
@Roles('admin')
@Controller('parametros-ventas')
export class ParametrosVentaController {
  constructor(
    private readonly getParametros: GetParametroVentaUseCase,
    private readonly updateParametros: UpdateParametroVentaUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtener los parámetros de ventas (HU-A-045)' })
  @ApiOkResponse({ description: 'Parámetros vigentes' })
  async find() {
    return ParametroVentaPresenter.toHttp(await this.getParametros.execute());
  }

  @Patch()
  @ApiOperation({
    summary:
      'Actualizar umbral mayorista, promociones y métodos de pago (RF-A193 a RF-A195)',
  })
  @ApiOkResponse({ description: 'Parámetros actualizados' })
  @ApiBadRequestResponse({
    description:
      'Umbral fuera de rango (2 a 10,000) o ningún método de pago activo',
  })
  async update(@Body() dto: UpdateParametroVentaDto) {
    return ParametroVentaPresenter.toHttp(
      await this.updateParametros.execute(dto),
    );
  }
}
