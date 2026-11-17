import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { SolicitudCambioEmailEntity } from '../../domain/entities/solicitud-cambio-email.entity';
import {
  AplicarCambioEmailResultado,
  SolicitudCambioEmailRepository,
} from '../../domain/repositories/solicitud-cambio-email.repository';
import { SolicitudCambioEmailMapper } from '../mappers/solicitud-cambio-email.mapper';

@Injectable()
export class PrismaSolicitudCambioEmailRepository implements SolicitudCambioEmailRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(
    userId: string,
  ): Promise<SolicitudCambioEmailEntity | null> {
    const solicitud = await this.prisma.solicitudCambioEmail.findUnique({
      where: { user_id: userId },
    });
    return solicitud ? SolicitudCambioEmailMapper.toDomain(solicitud) : null;
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<SolicitudCambioEmailEntity | null> {
    const solicitud = await this.prisma.solicitudCambioEmail.findUnique({
      where: { token_hash: tokenHash },
    });
    return solicitud ? SolicitudCambioEmailMapper.toDomain(solicitud) : null;
  }

  async save(
    userId: string,
    emailNuevo: string,
    tokenHash: string,
    expiraAt: Date,
  ): Promise<void> {
    await this.prisma.solicitudCambioEmail.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        email_nuevo: emailNuevo,
        token_hash: tokenHash,
        expira_at: expiraAt,
      },
      update: {
        email_nuevo: emailNuevo,
        token_hash: tokenHash,
        expira_at: expiraAt,
      },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.solicitudCambioEmail.deleteMany({
      where: { user_id: userId },
    });
  }

  async applyChange(
    userId: string,
    emailNuevo: string,
    tokenHash: string,
  ): Promise<AplicarCambioEmailResultado> {
    try {
      return await this.prisma.$transaction(
        async (tx): Promise<AplicarCambioEmailResultado> => {
          // Se consume primero: el token es de un solo uso.
          const borradas = await tx.solicitudCambioEmail.deleteMany({
            where: { user_id: userId, token_hash: tokenHash },
          });
          if (borradas.count === 0) {
            return 'token_invalido';
          }

          const ocupado = await tx.user.findFirst({
            where: { email: emailNuevo, id: { not: userId } },
            select: { id: true },
          });
          if (ocupado) {
            return 'email_en_uso';
          }

          await tx.user.update({
            where: { id: userId },
            data: { email: emailNuevo, email_verificado: true },
          });
          // Las sesiones abiertas siguen activas: la HU no pide cerrarlas.
          return 'ok';
        },
      );
    } catch (error) {
      // Carrera: otra cuenta tomó el correo entre la validación y el update.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return 'email_en_uso';
      }
      throw error;
    }
  }
}
