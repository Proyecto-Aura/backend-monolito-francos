import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UpdatePerfilDto } from '../../application/dto/perfil-dtos/update-perfil.dto';
import { VerificarCambioEmailDto } from '../../application/dto/perfil-dtos/verificar-cambio-email.dto';
import { GetPerfilUseCase } from '../../application/use-cases/perfil/get-perfil.use-case';
import { UpdatePerfilUseCase } from '../../application/use-cases/perfil/update-perfil.use-case';
import { VerifyEmailChangeUseCase } from '../../application/use-cases/perfil/verify-email-change.use-case';
import { PerfilPresenter } from '../presenters/perfil.presenter';
import { CurrentUser } from '../../../auth/presentation/decorators/current-user.decorator';
import { Public } from '../../../auth/presentation/decorators/public.decorator';
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
    private readonly verifyEmailChange: VerifyEmailChangeUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Ver mi perfil' })
  @ApiOkResponse({ description: 'Datos del cliente que inició sesión' })
  async findMine(@CurrentUser() user: AuthenticatedUser) {
    return PerfilPresenter.toHttp(await this.getPerfil.execute(user.userId));
  }

  @Patch()
  @ApiOperation({
    summary: 'Editar mi nombre, email y teléfono',
    description:
      'Si el email cambia, no se aplica: se envía un enlace de verificación a la dirección nueva y la respuesta lo indica con cambio_email_pendiente.',
  })
  @ApiOkResponse({ description: 'Perfil actualizado' })
  @ApiBadRequestResponse({ description: 'Algún dato no es válido' })
  @ApiConflictResponse({ description: 'El correo ya lo usa otra cuenta' })
  async updateMine(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePerfilDto,
  ) {
    const { perfil, cambioEmailPendiente } = await this.updatePerfil.execute(
      user.userId,
      dto,
    );
    return PerfilPresenter.toHttp(perfil, cambioEmailPendiente);
  }

  @Post('email/verificar')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirmar el cambio de email con el token' })
  @ApiOkResponse({ description: 'Correo actualizado correctamente' })
  @ApiBadRequestResponse({
    description: 'El enlace no es válido o ya venció',
  })
  @ApiConflictResponse({ description: 'El correo ya lo usa otra cuenta' })
  async verificarCambioEmail(@Body() dto: VerificarCambioEmailDto) {
    await this.verifyEmailChange.execute(dto);
    return { message: 'Correo actualizado correctamente' };
  }
}
