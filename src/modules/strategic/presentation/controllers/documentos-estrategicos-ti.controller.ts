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
import { EliminarDocumentoEstrategicoTiUseCase } from '../../application/use-cases/documento-estrategico/eliminar-documento-estrategico-ti.use-case';
import { ListarDocumentosEstrategicosTiUseCase } from '../../application/use-cases/documento-estrategico/listar-documentos-estrategicos-ti.use-case';
import { ListarTodosDocumentosEstrategicosTiUseCase } from '../../application/use-cases/documento-estrategico/listar-todos-documentos-estrategicos-ti.use-case';
import { ObtenerDocumentoEstrategicoTiByIdUseCase } from '../../application/use-cases/documento-estrategico/obtener-documento-estrategico-ti-by-id.use-case';
import { SubirDocumentoEstrategicoTiUseCase } from '../../application/use-cases/documento-estrategico/subir-documento-estrategico-ti.use-case';
import { DocumentoEstrategicoPresenter } from '../presenters/documento-estrategico.presenter';

@ApiTags('Documentos Estratégicos TI')
@ApiBearerAuth()
@Roles('admin', 'estrategico')
@Controller('documentos-estrategicos-ti')
export class DocumentosEstrategicosTiController {
  constructor(
    private readonly subirDocumentoEstrategicoTi: SubirDocumentoEstrategicoTiUseCase,
    private readonly listarDocumentosEstrategicosTi: ListarDocumentosEstrategicosTiUseCase,
    private readonly listarTodosDocumentosEstrategicosTi: ListarTodosDocumentosEstrategicosTiUseCase,
    private readonly obtenerDocumentoEstrategicoTiById: ObtenerDocumentoEstrategicoTiByIdUseCase,
    private readonly eliminarDocumentoEstrategicoTi: EliminarDocumentoEstrategicoTiUseCase,
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
  @ApiOperation({ summary: 'Subir un documento estratégico TI' })
  @ApiCreatedResponse({
    description: 'Documento estratégico TI subido correctamente',
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
    const documento = await this.subirDocumentoEstrategicoTi.execute(
      dto,
      archivo,
    );
    return DocumentoEstrategicoPresenter.toHttp(documento);
  }

  @Get()
  @ApiOperation({ summary: 'Listar documentos estratégicos TI de un plan' })
  @ApiOkResponse({
    description: 'Lista paginada de documentos estratégicos TI',
  })
  async findAll(@Query() query: ListDocumentoEstrategicoQueryDto) {
    const { result, urls } =
      await this.listarDocumentosEstrategicosTi.execute(query);
    return DocumentoEstrategicoPresenter.paginatedToHttp(result, urls);
  }

  // GET /documentos-estrategicos-ti/todos deshabilitado: `eliminar` hace
  // borrado físico, así que nunca existe una fila `estado: false` que listar.
  // Se deja comentado por si en el futuro se necesita reactivar.
  // @Get('todos')
  // @Roles('admin')
  // @ApiOperation({
  //   summary:
  //     'Listar TODOS los documentos estratégicos TI de un plan, incluidos los eliminados lógicamente',
  // })
  // @ApiOkResponse({
  //   description: 'Documentos estratégicos TI, incluidos los inactivos',
  // })
  // async findAllTodos(@Query() query: ListDocumentoEstrategicoQueryDto) {
  //   const { result, urls } =
  //     await this.listarTodosDocumentosEstrategicosTi.execute(query);
  //   return DocumentoEstrategicoPresenter.paginatedToHttp(result, urls);
  // }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un documento estratégico TI por ID' })
  @ApiOkResponse({ description: 'Documento estratégico TI encontrado' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const { documento, url } =
      await this.obtenerDocumentoEstrategicoTiById.execute(id);
    return DocumentoEstrategicoPresenter.toHttp(documento, url);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un documento estratégico TI' })
  @ApiOkResponse({
    description: 'Documento estratégico TI eliminado correctamente',
  })
  @ApiParam({ name: 'id', type: Number })
  async eliminar(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.eliminarDocumentoEstrategicoTi.execute(id);
  }
}
