import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UpdatePerfilDto } from '../../application/dto/perfil-dtos/update-perfil.dto';
import { GetPerfilUseCase } from '../../application/use-cases/perfil/get-perfil.use-case';
import { UpdatePerfilUseCase } from '../../application/use-cases/perfil/update-perfil.use-case';
import { PerfilPresenter } from '../presenters/perfil.presenter';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../../auth/presentation/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../../auth/presentation/strategies/jwt.strategy';

// "Mi perfil" del Portal B (HU-B-015): el cliente ve y edita sus propios datos.
@ApiTags('Perfil del cliente')
@ApiBearerAuth()
@Roles('cliente')
@Controller('perfil')
export class PerfilController {
  constructor(
    private readonly getPerfil: GetPerfilUseCase,
    private readonly updatePerfil: UpdatePerfilUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Ver mi perfil' })
  @ApiOkResponse({ description: 'Datos del cliente que inició sesión' })
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    return PerfilPresenter.toHttp(await this.getPerfil.execute(user.userId));
  }

  @Patch()
  @ApiOperation({ summary: 'Editar mi nombre, email y teléfono' })
  @ApiOkResponse({ description: 'Perfil actualizado' })
  @ApiBadRequestResponse({ description: 'Algún dato no es válido' })
  @ApiConflictResponse({ description: 'El correo ya lo usa otra cuenta' })
  async updateMine(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePerfilDto,
  ) {
    return PerfilPresenter.toHttp(
      await this.updatePerfil.execute(user.userId, dto),
    );
  }
}
