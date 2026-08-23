import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_FILTER } from '@nestjs/core';
import { envs } from '../../../config/envs';
import { PersonsModule } from '../../persons/presentation/persons.module';
import { RegisterClienteUseCase } from '../application/use-cases/register-cliente.use-case';
import { RegisterClienteByStaffUseCase } from '../application/use-cases/register-cliente-by-staff.use-case';
import { RegisterEmpleadoUseCase } from '../application/use-cases/register-empleado.use-case';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from '../application/use-cases/logout.use-case';
import { RegistroRepository } from '../domain/repositories/registro.repository';
import { PrismaRegistroRepository } from '../infrastructure/repositories/prisma-registro.repository';
import { RefreshTokenRepository } from '../domain/repositories/refresh-token.repository';
import { PrismaRefreshTokenRepository } from '../infrastructure/repositories/prisma-refresh-token.repository';
import { EmailService } from '../domain/services/email.service';
import { NodemailerEmailService } from '../infrastructure/services/nodemailer-email.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthController } from './controllers/auth.controller';
import { AuthDomainExceptionFilter } from './filters/auth-domain-exception.filter';

@Module({
  imports: [
    PersonsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: envs.jwtSecret,
      signOptions: { expiresIn: envs.jwtAccessExpiresIn as any },
    }),
  ],
  controllers: [AuthController],
  providers: [
    RegisterClienteUseCase,
    RegisterClienteByStaffUseCase,
    RegisterEmpleadoUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    { provide: RegistroRepository, useClass: PrismaRegistroRepository },
    { provide: RefreshTokenRepository, useClass: PrismaRefreshTokenRepository },
    { provide: EmailService, useClass: NodemailerEmailService },
    {
      provide: APP_FILTER,
      useClass: AuthDomainExceptionFilter,
    },
  ],
  exports: [JwtModule],
})
export class AuthModule {}
