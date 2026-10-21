import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import { ListFrecuenciasMedicionUseCase } from '../../application/use-cases/frecuencia-medicion/list-frecuencias-medicion.use-case';
import { FrecuenciaMedicionPresenter } from '../presenters/frecuencia-medicion.presenter';

@ApiTags('Frecuencias de Medición')
@ApiBearerAuth()
@Roles('admin', 'estrategico')
@Controller('frecuencias-medicion')
export class FrecuenciasMedicionController {
  constructor(
    private readonly listFrecuenciasMedicion: ListFrecuenciasMedicionUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar el catálogo de frecuencias de medición' })
  @ApiOkResponse({ description: 'Lista de frecuencias ordenada por orden' })
  async findAll() {
    return FrecuenciaMedicionPresenter.listToHttp(
      await this.listFrecuenciasMedicion.execute(),
    );
  }
}
