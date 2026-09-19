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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreatePersonaDto } from '../../application/dto/persona-dtos/create-persona.dto';
import { ListPersonasQueryDto } from '../../application/dto/persona-dtos/list-personas-query.dto';
import { UpdatePersonaDto } from '../../application/dto/persona-dtos/update-persona.dto';
import { ChangePersonaStatusUseCase } from '../../application/use-cases/personas/change-persona-status.use-case';
import { CreatePersonaUseCase } from '../../application/use-cases/personas/create-persona.use-case';
import { GetPersonaByIdUseCase } from '../../application/use-cases/personas/get-persona-by-id.use-case';
import { ListPersonasUseCase } from '../../application/use-cases/personas/list-personas.use-case';
import { UpdatePersonaUseCase } from '../../application/use-cases/personas/update-persona.use-case';
import { PersonaPresenter } from '../presenters/persona.presenter';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';

@ApiTags('Personas')
@ApiBearerAuth()
@Roles('admin', 'ventas')
@Controller('personas')
export class PersonasController {
  constructor(
    private readonly createPersona: CreatePersonaUseCase,
    private readonly getPersonaById: GetPersonaByIdUseCase,
    private readonly listPersonas: ListPersonasUseCase,
    private readonly updatePersona: UpdatePersonaUseCase,
    private readonly changePersonaStatus: ChangePersonaStatusUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear una persona' })
  @ApiCreatedResponse({ description: 'Persona creada correctamente' })
  async create(@Body() dto: CreatePersonaDto) {
    return PersonaPresenter.toHttp(await this.createPersona.execute(dto));
  }

  @Get()
  @ApiOperation({ summary: 'Listar personas' })
  @ApiOkResponse({ description: 'Lista paginada de personas' })
  async findAll(@Query() query: ListPersonasQueryDto) {
    return PersonaPresenter.paginatedToHttp(
      await this.listPersonas.execute(query),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una persona por ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return PersonaPresenter.toHttp(await this.getPersonaById.execute(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una persona' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdatePersonaDto,
  ) {
    return PersonaPresenter.toHttp(await this.updatePersona.execute(id, dto));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar una persona' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async deactivate(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return PersonaPresenter.toHttp(
      await this.changePersonaStatus.execute(id, false),
    );
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Reactivar una persona' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async activate(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return PersonaPresenter.toHttp(
      await this.changePersonaStatus.execute(id, true),
    );
  }
}
