import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ListDistritosQueryDto,
  ListProvinciasQueryDto,
} from '../../application/dto/ubigeo-dtos/ubigeo-query.dto';
import {
  ListDepartamentosUseCase,
  ListDistritosUseCase,
  ListProvinciasUseCase,
} from '../../application/use-cases/ubigeo/consultar-ubigeo.use-cases';
import { Authenticated } from '../../../auth/presentation/decorators/authenticated.decorator';

// Catálogo de solo lectura para los selects en cascada de ubicación.
@ApiTags('Ubigeo')
@ApiBearerAuth()
@Authenticated()
@Controller('ubigeo')
export class UbigeoController {
  constructor(
    private readonly listDepartamentos: ListDepartamentosUseCase,
    private readonly listProvincias: ListProvinciasUseCase,
    private readonly listDistritos: ListDistritosUseCase,
  ) {}

  @Get('departamentos')
  @ApiOperation({ summary: 'Listar departamentos' })
  findDepartamentos() {
    return this.listDepartamentos.execute();
  }

  @Get('provincias')
  @ApiOperation({ summary: 'Listar las provincias de un departamento' })
  findProvincias(@Query() query: ListProvinciasQueryDto) {
    return this.listProvincias.execute(query.departamento_id);
  }

  @Get('distritos')
  @ApiOperation({ summary: 'Listar los distritos de una provincia' })
  findDistritos(@Query() query: ListDistritosQueryDto) {
    return this.listDistritos.execute(query.provincia_id);
  }
}
