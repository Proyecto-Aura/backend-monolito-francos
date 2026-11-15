import { SolicitudCambioEmailEntity } from '../entities/solicitud-cambio-email.entity';

// Resultado de aplicar el cambio: el token puede haberse consumido antes o el
// correo nuevo pudo ser tomado por otra cuenta entre la solicitud y la
// confirmación.
export type AplicarCambioEmailResultado =
  'ok' | 'token_invalido' | 'email_en_uso';

export abstract class SolicitudCambioEmailRepository {
  abstract findByUserId(
    userId: string,
  ): Promise<SolicitudCambioEmailEntity | null>;
  abstract findByTokenHash(
    tokenHash: string,
  ): Promise<SolicitudCambioEmailEntity | null>;
  abstract save(
    userId: string,
    emailNuevo: string,
    tokenHash: string,
    expiraAt: Date,
  ): Promise<void>;
  abstract deleteByUserId(userId: string): Promise<void>;
  abstract applyChange(
    userId: string,
    emailNuevo: string,
    tokenHash: string,
  ): Promise<AplicarCambioEmailResultado>;
}
