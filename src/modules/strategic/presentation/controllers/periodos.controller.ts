import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import { ListPeriodosQueryDto } from '../../application/dto/periodo-dtos/list-periodos-query.dto';
import { ListPeriodosPorFrecuenciaUseCase } from '../../application/use-cases/periodo/list-periodos-por-frecuencia.use-case';
import { PeriodoPresenter } from '../presenters/periodo.presenter';

@ApiTags('Periodos')
@ApiBearerAuth()
@Roles('admin', 'estrategico')
@Controller('periodos')
export class PeriodosController {
  constructor(
    private readonly listPeriodosPorFrecuencia: ListPeriodosPorFrecuenciaUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar periodos de una frecuencia de medición' })
  @ApiOkResponse({ description: 'Lista de periodos ordenada por número' })
  async findAll(@Query() query: ListPeriodosQueryDto) {
    return PeriodoPresenter.listToHttp(
      await this.listPeriodosPorFrecuencia.execute(query),
    );
  }
}
