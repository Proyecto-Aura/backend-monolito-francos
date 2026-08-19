import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_FILTER } from '@nestjs/core';
import { envs } from '../../../config/envs';
import { PersonsModule } from '../../persons/presentation/persons.module';
import { RegisterClienteUseCase } from '../application/use-cases/register-cliente.use-case';
import { RegisterClienteByStaffUseCase } from '../application/use-cases/register-cliente-by-staff.use-case';
import { RegisterEmpleadoUseCase } from '../application/use-cases/register-empleado.use-case';
import { RegistroRepository } from '../domain/repositories/registro.repository';
import { PrismaRegistroRepository } from '../infrastructure/repositories/prisma-registro.repository';
import { EmailService } from '../domain/services/email.service';
import { NodemailerEmailService } from '../infrastructure/services/nodemailer-email.service';
import { AuthController } from './controllers/auth.controller';
import { AuthDomainExceptionFilter } from './filters/auth-domain-exception.filter';

@Module({
  imports: [
    PersonsModule,
    JwtModule.register({
      secret: envs.jwtSecret,
      signOptions: { expiresIn: envs.jwtExpiresIn as any },
    }),
  ],
  controllers: [AuthController],
  providers: [
    RegisterClienteUseCase,
    RegisterClienteByStaffUseCase,
    RegisterEmpleadoUseCase,
    { provide: RegistroRepository, useClass: PrismaRegistroRepository },
    { provide: EmailService, useClass: NodemailerEmailService },
    {
      provide: APP_FILTER,
      useClass: AuthDomainExceptionFilter,
    },
  ],
  exports: [JwtModule],
})
export class AuthModule {}
