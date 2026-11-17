import { BadRequestException } from '@nestjs/common';
import {
  validarFila,
  validarFilas,
} from '../../utils/validar-fila-movimiento.util';
import { CreateSalidaMovimientoDto } from './create-salida-movimiento.dto';

describe('CreateSalidaMovimientoDto: vínculo de solicitud solo interno', () => {
  const fila = { insumo_id: 10, cantidad: 2.5, razon: 'Salida manual' };

  it('admite la salida manual sin exigir ni inicializar solicitud_insumos_id', async () => {
    const dto = await validarFila(CreateSalidaMovimientoDto, {
      ...fila,
      insumo_id: '10',
      cantidad: '2.5',
    });
    expect(dto).toMatchObject(fila);
    expect(dto).not.toHaveProperty('solicitud_insumos_id');
  });

  it.each([false, true])(
    'rechaza el vínculo enviado en un body HTTP (array=%s)',
    async (array) => {
      const falsificada = { ...fila, solicitud_insumos_id: 7 };
      const validacion = array
        ? validarFilas(CreateSalidaMovimientoDto, [fila, falsificada])
        : validarFila(CreateSalidaMovimientoDto, falsificada);
      const error: unknown = await validacion.catch((error: unknown) => error);
      expect(error).toBeInstanceOf(BadRequestException);
      const respuesta = (error as BadRequestException).getResponse() as {
        message: string[];
      };
      expect(respuesta.message).toContain(
        'property solicitud_insumos_id should not exist',
      );
    },
  );
});
