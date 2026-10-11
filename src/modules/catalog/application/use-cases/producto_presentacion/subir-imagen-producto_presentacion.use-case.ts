import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { S3Service } from '../../../../../infrastructure/storage/s3.service';
import { ProductoPresentacionEntity } from '../../../domain/entities/producto_presentacion.entity';
import { ResourceNotFoundError } from '../../../domain/errors/catalog-domain.errors';
import { ProductoPresentacionRepository } from '../../../domain/repositories/producto_presentacion.repository';

// Las imágenes se sirven con CloudFront y cada una tiene una key única, por eso
// el navegador puede guardarlas un año sin revalidar.
const CACHE_CONTROL_IMAGEN = 'public, max-age=31536000, immutable';

interface TipoImagen {
  mime: string;
  extension: string;
}

// El tipo con el que se guarda la imagen sale de los primeros bytes del archivo
// y no del Content-Type que manda el navegador, que el cliente puede falsear.
function detectarTipoImagen(buffer: Buffer): TipoImagen | null {
  const empieza = (...bytes: number[]) =>
    buffer.length >= bytes.length && bytes.every((b, i) => buffer[i] === b);

  if (empieza(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return { mime: 'image/png', extension: 'png' };
  }
  if (empieza(0xff, 0xd8, 0xff)) {
    return { mime: 'image/jpeg', extension: 'jpg' };
  }
  if (
    empieza(0x52, 0x49, 0x46, 0x46) &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mime: 'image/webp', extension: 'webp' };
  }
  return null;
}

@Injectable()
export class SubirImagenProductoPresentacionUseCase {
  constructor(
    private readonly productoPresentacionRepository: ProductoPresentacionRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(
    id: number,
    imagen: Express.Multer.File,
  ): Promise<ProductoPresentacionEntity> {
    const productoPresentacion =
      await this.productoPresentacionRepository.findById(id);

    if (!productoPresentacion) {
      throw new ResourceNotFoundError('Producto presentación no encontrada');
    }

    const tipo = detectarTipoImagen(imagen.buffer);
    if (!tipo) {
      throw new BadRequestException('La imagen debe ser JPG, PNG o WEBP');
    }

    // Al reemplazar se sube una key nueva; la imagen anterior no se borra porque
    // el backend no tiene permiso de borrado sobre francos-media.
    const key = `productos/${randomUUID()}.${tipo.extension}`;

    await this.s3Service.upload(
      'media',
      key,
      imagen.buffer,
      tipo.mime,
      CACHE_CONTROL_IMAGEN,
    );

    return this.productoPresentacionRepository.update(id, { imagen_key: key });
  }
}
