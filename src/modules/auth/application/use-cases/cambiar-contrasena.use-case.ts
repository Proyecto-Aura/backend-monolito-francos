import { Injectable } from '@nestjs/common';
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from '../../domain/errors/auth-domain.errors';
import { CambioContrasenaRepository } from '../../domain/repositories/cambio-contrasena.repository';
import { CambiarContrasenaDto } from '../dto/cambiar-contrasena.dto';
import { comparePassword, hashPassword } from '../utils/password.util';

export const CONTRASENA_ACTUAL_INCORRECTA =
  'La contraseña actual no es correcta';
export const CONTRASENA_IGUAL_A_LA_ACTUAL =
  'La nueva contraseña debe ser distinta de la actual';

// HU-B-017 (RF-B45): el cliente cambia su contraseña validando antes la actual.
// Sigue conectado en la sesión desde la que la cambia; las demás se cierran,
// como al restablecerla.
@Injectable()
export class CambiarContrasenaUseCase {
  constructor(
    private readonly cambioContrasenaRepository: CambioContrasenaRepository,
  ) {}

  async execute(
    userId: string,
    sesionActualId: string | null,
    dto: CambiarContrasenaDto,
  ): Promise<void> {
    const usuario =
      await this.cambioContrasenaRepository.findCredenciales(userId);
    if (!usuario || !usuario.estado) {
      throw new ResourceNotFoundError('El usuario no existe o está inactivo');
    }

    // 400 y no 401: la sesión es válida, solo falló la contraseña escrita.
    if (!(await comparePassword(dto.contrasena_actual, usuario.contrasena))) {
      throw new InvalidRequestError(CONTRASENA_ACTUAL_INCORRECTA);
    }
    if (await comparePassword(dto.nueva_contrasena, usuario.contrasena)) {
      throw new InvalidRequestError(CONTRASENA_IGUAL_A_LA_ACTUAL);
    }

    await this.cambioContrasenaRepository.cambiarContrasena({
      userId,
      contrasenaHash: await hashPassword(dto.nueva_contrasena),
      sesionActualId,
    });
  }
}
