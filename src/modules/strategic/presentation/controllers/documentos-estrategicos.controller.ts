import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import { CreateDocumentoEstrategicoDto } from '../../application/dto/documento-estrategico-dtos/create-documento-estrategico.dto';
import { ListDocumentoEstrategicoQueryDto } from '../../application/dto/documento-estrategico-dtos/list-documento-estrategico-query.dto';
import { EliminarDocumentoEstrategicoUseCase } from '../../application/use-cases/documento-estrategico/eliminar-documento-estrategico.use-case';
import { ListarDocumentosEstrategicosUseCase } from '../../application/use-cases/documento-estrategico/listar-documentos-estrategicos.use-case';
import { ListarTodosDocumentosEstrategicosUseCase } from '../../application/use-cases/documento-estrategico/listar-todos-documentos-estrategicos.use-case';
import { ObtenerDocumentoEstrategicoByIdUseCase } from '../../application/use-cases/documento-estrategico/obtener-documento-estrategico-by-id.use-case';
import { SubirDocumentoEstrategicoUseCase } from '../../application/use-cases/documento-estrategico/subir-documento-estrategico.use-case';
import { DocumentoEstrategicoPresenter } from '../presenters/documento-estrategico.presenter';

@ApiTags('Documentos Estratégicos')
@ApiBearerAuth()
@Roles('admin', 'estrategico')
@Controller('documentos-estrategicos')
export class DocumentosEstrategicosController {
  constructor(
    private readonly subirDocumentoEstrategico: SubirDocumentoEstrategicoUseCase,
    private readonly listarDocumentosEstrategicos: ListarDocumentosEstrategicosUseCase,
    private readonly listarTodosDocumentosEstrategicos: ListarTodosDocumentosEstrategicosUseCase,
    private readonly obtenerDocumentoEstrategicoById: ObtenerDocumentoEstrategicoByIdUseCase,
    private readonly eliminarDocumentoEstrategico: EliminarDocumentoEstrategicoUseCase,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('archivo'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        plan_estrategico_id: { type: 'number' },
        nombre: { type: 'string' },
        archivo: { type: 'string', format: 'binary' },
      },
      required: ['plan_estrategico_id', 'nombre', 'archivo'],
    },
  })
  @ApiOperation({ summary: 'Subir un documento estratégico' })
  @ApiCreatedResponse({
    description: 'Documento estratégico subido correctamente',
  })
  async subir(
    @Body() dto: CreateDocumentoEstrategicoDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType:
            /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|image\/(jpeg|png|gif|webp))$/,
        })
        .addMaxSizeValidator({ maxSize: 10 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    archivo: Express.Multer.File,
  ) {
    const documento = await this.subirDocumentoEstrategico.execute(
      dto,
      archivo,
    );
    return DocumentoEstrategicoPresenter.toHttp(documento);
  }

  @Get()
  @ApiOperation({ summary: 'Listar documentos estratégicos de un plan' })
  @ApiOkResponse({ description: 'Lista paginada de documentos estratégicos' })
  async findAll(@Query() query: ListDocumentoEstrategicoQueryDto) {
    const { result, urls } =
      await this.listarDocumentosEstrategicos.execute(query);
    return DocumentoEstrategicoPresenter.paginatedToHttp(result, urls);
  }

  // GET /documentos-estrategicos/todos deshabilitado (no comentar por qué dentro
  // del código es obvio): desde que `eliminar` hace borrado físico (Anexo 2),
  // nunca existe una fila `estado: false` que listar aquí. Se deja comentado,
  // no borrado, por si en el futuro se necesita reactivar.
  // @Get('todos')
  // @Roles('admin')
  // @ApiOperation({
  //   summary:
  //     'Listar TODOS los documentos estratégicos de un plan, incluidos los eliminados lógicamente',
  // })
  // @ApiOkResponse({
  //   description: 'Documentos estratégicos, incluidos los inactivos',
  // })
  // async findAllTodos(@Query() query: ListDocumentoEstrategicoQueryDto) {
  //   const { result, urls } =
  //     await this.listarTodosDocumentosEstrategicos.execute(query);
  //   return DocumentoEstrategicoPresenter.paginatedToHttp(result, urls);
  // }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un documento estratégico por ID' })
  @ApiOkResponse({ description: 'Documento estratégico encontrado' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const { documento, url } =
      await this.obtenerDocumentoEstrategicoById.execute(id);
    return DocumentoEstrategicoPresenter.toHttp(documento, url);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un documento estratégico' })
  @ApiOkResponse({
    description: 'Documento estratégico eliminado correctamente',
  })
  @ApiParam({ name: 'id', type: Number })
  async eliminar(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.eliminarDocumentoEstrategico.execute(id);
  }
}
