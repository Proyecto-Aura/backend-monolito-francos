import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import { ListUnidadesMedidaKpiUseCase } from '../../application/use-cases/unidad-medida-kpi/list-unidades-medida-kpi.use-case';
import { UnidadMedidaKpiPresenter } from '../presenters/unidad-medida-kpi.presenter';

@ApiTags('Unidades de Medida KPI')
@ApiBearerAuth()
@Roles('admin', 'estrategico')
@Controller('unidades-medida-kpi')
export class UnidadesMedidaKpiController {
  constructor(
    private readonly listUnidadesMedidaKpi: ListUnidadesMedidaKpiUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar el catálogo de unidades de medida KPI' })
  @ApiOkResponse({ description: 'Lista de unidades de medida ordenada por id' })
  async findAll() {
    return UnidadMedidaKpiPresenter.listToHttp(
      await this.listUnidadesMedidaKpi.execute(),
    );
  }
}
