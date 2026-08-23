import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RegisterClienteDto } from '../../application/dto/register-cliente.dto';
import { RegisterClienteByStaffDto } from '../../application/dto/register-cliente-by-staff.dto';
import { RegisterEmpleadoDto } from '../../application/dto/register-empleado.dto';
import { LoginDto } from '../../application/dto/login.dto';
import { RegisterClienteUseCase } from '../../application/use-cases/register-cliente.use-case';
import { RegisterClienteByStaffUseCase } from '../../application/use-cases/register-cliente-by-staff.use-case';
import { RegisterEmpleadoUseCase } from '../../application/use-cases/register-empleado.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { AuthPresenter } from '../presenters/auth.presenter';
import { envs } from '../../../../config/envs';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const MS_POR_DIA = 24 * 60 * 60 * 1000;

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerCliente: RegisterClienteUseCase,
    private readonly registerClienteByStaff: RegisterClienteByStaffUseCase,
    private readonly registerEmpleado: RegisterEmpleadoUseCase,
    private readonly login: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Registro público de cliente (self-service)' })
  @ApiCreatedResponse({ description: 'Cliente registrado correctamente' })
  async register(@Body() dto: RegisterClienteDto) {
    const resultado = await this.registerCliente.execute(dto);
    return AuthPresenter.registroToHttp(resultado.user);
  }

  @Post('register/cliente')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'ventas')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registro de cliente por staff (admin o ventas), con credenciales por defecto' })
  @ApiCreatedResponse({ description: 'Cliente registrado correctamente' })
  async registerByStaff(@Body() dto: RegisterClienteByStaffDto) {
    const resultado = await this.registerClienteByStaff.execute(dto);
    return AuthPresenter.registroToHttp(resultado.user);
  }

  @Post('register/empleado')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registro de empleado (solo admin), con credenciales por defecto' })
  @ApiCreatedResponse({ description: 'Empleado registrado correctamente' })
  async registerEmpleadoStaff(@Body() dto: RegisterEmpleadoDto) {
    const resultado = await this.registerEmpleado.execute(dto);
    return AuthPresenter.registroToHttp(resultado.user);
  }

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiCreatedResponse({ description: 'Login exitoso' })
  async iniciarSesion(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resultado = await this.login.execute(dto);
    this.setRefreshTokenCookie(res, resultado.refreshTokenPlano);
    return AuthPresenter.loginToHttp(resultado);
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Renovar el access_token usando el refresh_token de la cookie',
  })
  async refrescarToken(@Req() req: Request) {
    const refreshTokenPlano = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!refreshTokenPlano) {
      throw new UnauthorizedException('No se encontró refresh token');
    }
    const resultado = await this.refreshTokenUseCase.execute(refreshTokenPlano);
    return { access_token: resultado.accessToken };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Cerrar sesión' })
  async cerrarSesion(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshTokenPlano = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (refreshTokenPlano) {
      await this.logoutUseCase.execute(refreshTokenPlano);
    }
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/api/v1/auth' });
    return { message: 'Sesión cerrada' };
  }

  private setRefreshTokenCookie(res: Response, refreshTokenPlano: string) {
    res.cookie(REFRESH_TOKEN_COOKIE, refreshTokenPlano, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: envs.refreshTokenExpiresInDays * MS_POR_DIA,
    });
  }
}
