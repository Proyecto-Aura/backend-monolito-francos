import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import { ListPerspectivasBscUseCase } from '../../application/use-cases/perspectiva-bsc/list-perspectivas-bsc.use-case';
import { PerspectivaBscPresenter } from '../presenters/perspectiva-bsc.presenter';

@ApiTags('Perspectivas BSC')
@ApiBearerAuth()
@Roles('admin', 'estrategico')
@Controller('perspectivas-bsc')
export class PerspectivasBscController {
  constructor(
    private readonly listPerspectivasBsc: ListPerspectivasBscUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar el catálogo de perspectivas BSC' })
  @ApiOkResponse({
    description: 'Lista de perspectivas BSC ordenada por orden',
  })
  async findAll() {
    return PerspectivaBscPresenter.listToHttp(
      await this.listPerspectivasBsc.execute(),
    );
  }
}
