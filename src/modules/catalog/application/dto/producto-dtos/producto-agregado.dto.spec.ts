import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { TipoPromocion } from '@prisma/client';
import { CreateProductoPresentacionDto } from '../producto_presentacion-dtos/create-producto_presentacion.dto';
import { CreateProductoWithPresentacionesDto } from './create-producto-with-presentaciones.dto';
import { UpdateProductoWithPresentacionesDto } from './update-producto-with-presentaciones.dto';

describe('DTO del agregado producto', () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  const metadata = (metatype: new () => object) => ({
    type: 'body' as const,
    metatype,
    data: undefined,
  });

  const validCreatePayload = {
    categoria_id: 1,
    nombre: 'Arroz Superior',
    destacado: true,
    producto_presentaciones: [
      {
        precio_unitario: 8.5,
        presentacion_id: 1,
        imagen_url: 'https://example.com/arroz.jpg',
        promociones: [
          {
            nombre: 'Descuento de temporada',
            tipo: TipoPromocion.porcentaje,
            valor: 15,
            fecha_inicio: '2026-09-01',
            fecha_fin: '2026-09-30',
          },
        ],
      },
    ],
  };

  it('transforma y valida presentaciones y promociones anidadas', async () => {
    const transformed: unknown = await validationPipe.transform(
      validCreatePayload,
      metadata(CreateProductoWithPresentacionesDto),
    );

    expect(transformed).toBeInstanceOf(CreateProductoWithPresentacionesDto);
    if (!(transformed instanceof CreateProductoWithPresentacionesDto)) {
      throw new Error('El payload no fue transformado al DTO esperado');
    }
    expect(
      transformed.producto_presentaciones[0].promociones?.[0].fecha_inicio,
    ).toBeInstanceOf(Date);
  });

  it('rechaza el alta cuando falta la imagen obligatoria', async () => {
    const payload = structuredClone(validCreatePayload);
    delete (payload.producto_presentaciones[0] as { imagen_url?: string })
      .imagen_url;

    await expect(
      validationPipe.transform(
        payload,
        metadata(CreateProductoWithPresentacionesDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza propiedades no declaradas dentro de una promoción', async () => {
    const payload = structuredClone(validCreatePayload);
    Object.assign(payload.producto_presentaciones[0].promociones[0], {
      descuento_oculto: 99,
    });

    await expect(
      validationPipe.transform(
        payload,
        metadata(CreateProductoWithPresentacionesDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza una edición con presentaciones vacías', async () => {
    await expect(
      validationPipe.transform(
        { producto_presentaciones: [] },
        metadata(UpdateProductoWithPresentacionesDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza eliminar la imagen durante la edición', async () => {
    await expect(
      validationPipe.transform(
        { producto_presentaciones: [{ id: 1, imagen_url: null }] },
        metadata(UpdateProductoWithPresentacionesDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza id null al editar una promoción', async () => {
    await expect(
      validationPipe.transform(
        {
          producto_presentaciones: [
            {
              id: 1,
              promociones: [
                {
                  id: null,
                  nombre: 'Oferta',
                  tipo: TipoPromocion.porcentaje,
                  valor: 15,
                  fecha_inicio: '2026-09-01',
                  fecha_fin: '2026-09-30',
                },
              ],
            },
          ],
        },
        metadata(UpdateProductoWithPresentacionesDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza nombres de promoción compuestos solo por espacios', async () => {
    const payload = structuredClone(validCreatePayload);
    payload.producto_presentaciones[0].promociones[0].nombre = '   ';

    await expect(
      validationPipe.transform(
        payload,
        metadata(CreateProductoWithPresentacionesDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('también exige imagen al agregar una presentación por separado', async () => {
    await expect(
      validationPipe.transform(
        {
          producto_id: 10,
          presentacion_id: 2,
          precio_unitario: 8.5,
        },
        metadata(CreateProductoPresentacionDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
