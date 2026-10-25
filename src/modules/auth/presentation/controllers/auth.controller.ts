import {
  Body,
  Controller,
  HttpCode,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
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
import { ForgotPasswordDto } from '../../application/dto/forgot-password.dto';
import { ResetPasswordDto } from '../../application/dto/reset-password.dto';
import { VerifyEmailDto } from '../../application/dto/verify-email.dto';
import { ResendVerificationDto } from '../../application/dto/resend-verification.dto';
import { RequestPasswordResetUseCase } from '../../application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case';
import { VerifyEmailUseCase } from '../../application/use-cases/verify-email.use-case';
import { ResendVerificationUseCase } from '../../application/use-cases/resend-verification.use-case';
import { GetMeUseCase } from '../../application/use-cases/get-me.use-case';
import { AuthPresenter } from '../presenters/auth.presenter';
import { Roles } from '../decorators/roles.decorator';
import { Public } from '../decorators/public.decorator';
import { Authenticated } from '../decorators/authenticated.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../strategies/jwt.strategy';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const FORGOT_PASSWORD_MESSAGE =
  'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña';
const RESET_PASSWORD_MESSAGE = 'Contraseña restablecida correctamente';
const VERIFY_EMAIL_MESSAGE = 'Correo verificado correctamente';
const RESEND_VERIFICATION_MESSAGE =
  'Si el correo está registrado, recibirás un enlace de verificación';

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
    private readonly requestPasswordReset: RequestPasswordResetUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly resendVerificationUseCase: ResendVerificationUseCase,
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
  @ApiForbiddenResponse({
    description: 'El correo del cliente aún no fue verificado',
  })
  async iniciarSesion(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resultado = await this.login.execute(dto);
    this.setRefreshTokenCookie(
      res,
      resultado.refreshTokenPlano,
      resultado.refreshTokenExpiresAt,
    );
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

  @Post('forgot-password')
  @HttpCode(200)
  @Public()
  @ApiOperation({
    summary: 'Solicitar un enlace para restablecer la contraseña',
  })
  @ApiOkResponse({ description: 'Solicitud procesada correctamente' })
  @ApiBadRequestResponse({
    description: 'El correo no tiene un formato válido',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.requestPasswordReset.execute(dto);
    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  @Post('reset-password')
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: 'Restablecer la contraseña con un enlace válido' })
  @ApiOkResponse({ description: 'Contraseña restablecida correctamente' })
  @ApiBadRequestResponse({
    description: 'La solicitud no es válida o el enlace expiró',
  })
  async resetPasswordFromToken(@Body() dto: ResetPasswordDto) {
    await this.resetPassword.execute(dto);
    return { message: RESET_PASSWORD_MESSAGE };
  }

  @Post('verify-email')
  @HttpCode(200)
  @Public()
  @ApiOperation({
    summary: 'Verificar el correo electrónico con un enlace válido',
  })
  @ApiOkResponse({ description: 'Correo verificado correctamente' })
  @ApiBadRequestResponse({ description: 'El enlace no es válido o expiró' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.verifyEmailUseCase.execute(dto);
    return { message: VERIFY_EMAIL_MESSAGE };
  }

  @Post('resend-verification')
  @HttpCode(200)
  @Public()
  @ApiOperation({ summary: 'Reenviar un enlace de verificación de correo' })
  @ApiOkResponse({ description: 'Solicitud procesada correctamente' })
  @ApiBadRequestResponse({
    description: 'El correo no tiene un formato válido',
  })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.resendVerificationUseCase.execute(dto);
    return { message: RESEND_VERIFICATION_MESSAGE };
  }

  private setRefreshTokenCookie(
    res: Response,
    refreshTokenPlano: string,
    expiresAt: Date,
  ) {
    res.cookie(REFRESH_TOKEN_COOKIE, refreshTokenPlano, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: expiresAt.getTime() - Date.now(),
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
