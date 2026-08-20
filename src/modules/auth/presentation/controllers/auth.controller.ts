import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RegisterClienteDto } from '../../application/dto/register-cliente.dto';
import { LoginDto } from '../../application/dto/login.dto';
import { RegisterClienteUseCase } from '../../application/use-cases/register-cliente.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { AuthPresenter } from '../presenters/auth.presenter';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerCliente: RegisterClienteUseCase,
    private readonly login: LoginUseCase,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Registro público de cliente (self-service)' })
  @ApiCreatedResponse({ description: 'Cliente registrado correctamente' })
  async register(@Body() dto: RegisterClienteDto) {
    const resultado = await this.registerCliente.execute(dto);
    return AuthPresenter.registroToHttp(resultado.user);
  }

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiCreatedResponse({ description: 'Login exitoso' })
  async iniciarSesion(@Body() dto: LoginDto) {
    // TODO (Fase 8): meter result.refreshTokenPlano en una cookie httpOnly.
    const resultado = await this.login.execute(dto);
    return AuthPresenter.loginToHttp(resultado);
  }
}
