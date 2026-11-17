import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CambioContrasenaRepository } from '../../domain/repositories/cambio-contrasena.repository';
import {
  CambiarContrasenaParams,
  CredencialesUsuario,
} from '../../domain/repositories/types/cambio-contrasena-repository.types';

@Injectable()
export class PrismaCambioContrasenaRepository implements CambioContrasenaRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCredenciales(userId: string): Promise<CredencialesUsuario | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, contrasena: true, estado: true },
    });
  }

  async cambiarContrasena(params: CambiarContrasenaParams): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: params.userId },
        data: {
          contrasena: params.contrasenaHash,
          debe_cambiar_contrasena: false,
        },
      });
      await tx.refreshToken.updateMany({
        where: {
          user_id: params.userId,
          revoked_at: null,
          ...(params.sesionActualId
            ? { id: { not: params.sesionActualId } }
            : {}),
        },
        data: { revoked_at: new Date() },
      });
    });
  }
}
