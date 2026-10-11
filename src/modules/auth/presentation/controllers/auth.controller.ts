import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
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
import { GetMeUseCase } from '../../application/use-cases/get-me.use-case';
import { AuthPresenter } from '../presenters/auth.presenter';
import { envs } from '../../../../config/envs';
import { Roles } from '../decorators/roles.decorator';
import { Public } from '../decorators/public.decorator';
import { Authenticated } from '../decorators/authenticated.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../strategies/jwt.strategy';

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
    private readonly getMeUseCase: GetMeUseCase,
  ) {}

  @Get('me')
  @Authenticated()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Datos del usuario autenticado (nombre completo y roles)',
  })
  @ApiOkResponse({ description: 'Datos del usuario' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    const resultado = await this.getMeUseCase.execute(user.userId, user.roles);
    return AuthPresenter.meToHttp(resultado);
  }

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Registro público de cliente (self-service)' })
  @ApiCreatedResponse({ description: 'Cliente registrado correctamente' })
  async register(@Body() dto: RegisterClienteDto) {
    const resultado = await this.registerCliente.execute(dto);
    return AuthPresenter.registroToHttp(resultado.user);
  }

  @Post('register/cliente')
  @Roles('admin', 'ventas')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Registro de cliente por staff (admin o ventas), con credenciales por defecto',
  })
  @ApiCreatedResponse({ description: 'Cliente registrado correctamente' })
  async registerByStaff(@Body() dto: RegisterClienteByStaffDto) {
    const resultado = await this.registerClienteByStaff.execute(dto);
    return AuthPresenter.registroToHttp(resultado.user);
  }

  @Post('register/empleado')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Registro de empleado (solo admin), con credenciales por defecto',
  })
  @ApiCreatedResponse({ description: 'Empleado registrado correctamente' })
  async registerEmpleadoStaff(@Body() dto: RegisterEmpleadoDto) {
    const resultado = await this.registerEmpleado.execute(dto);
    return AuthPresenter.registroToHttp(resultado.user);
  }

  @Post('login')
  @Public()
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
  @Public()
  @ApiOperation({
    summary: 'Renovar el access_token usando el refresh_token de la cookie',
  })
  async refrescarToken(@Req() req: Request) {
    const refreshTokenPlano = this.getRefreshToken(req);
    if (!refreshTokenPlano) {
      throw new UnauthorizedException('No se encontró refresh token');
    }
    const resultado = await this.refreshTokenUseCase.execute(refreshTokenPlano);
    return { access_token: resultado.accessToken };
  }

  @Post('logout')
  @Public()
  @ApiOperation({ summary: 'Cerrar sesión' })
  async cerrarSesion(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshTokenPlano = this.getRefreshToken(req);
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

  private getRefreshToken(req: Request): string | undefined {
    const cookies = req.cookies as unknown;
    if (!cookies || typeof cookies !== 'object') {
      return undefined;
    }

    const refreshToken = (cookies as Record<string, unknown>)[
      REFRESH_TOKEN_COOKIE
    ];
    return typeof refreshToken === 'string' ? refreshToken : undefined;
  }
}
