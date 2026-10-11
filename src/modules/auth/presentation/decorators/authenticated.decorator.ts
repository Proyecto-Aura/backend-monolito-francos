import { SetMetadata } from '@nestjs/common';

export const IS_AUTHENTICATED_ONLY_KEY = 'isAuthenticatedOnly';

/**
 * Permite el acceso a cualquier usuario autenticado, sin importar su rol.
 * A diferencia de @Public(), esta ruta SÍ exige un JWT válido.
 */
export const Authenticated = () => SetMetadata(IS_AUTHENTICATED_ONLY_KEY, true);
