import { plainToInstance, ClassConstructor } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RegisterEmpleadoDto } from '../../../../auth/application/dto/register-empleado.dto';
import { CreateUsuarioInternoDto } from '../usuario-interno-dtos/create-usuario-interno.dto';
import { CreateEmpleadoDto } from './create-empleado.dto';
import { UpdateEmpleadoDto } from './update-empleado.dto';

const datosUsuario = {
  nombres: 'Ana',
  apellido_paterno: 'Torres',
  apellido_materno: 'Vega',
  tipo_documento: 'dni',
  numero_documento: '12345678',
  cargo: 'Responsable',
  email: 'ana@francos.test',
};

const casos: {
  nombre: string;
  tipo: ClassConstructor<object>;
  datos: object;
}[] = [
  {
    nombre: 'crear empleado',
    tipo: CreateEmpleadoDto,
    datos: { persona_id: '1b4e28ba-2fa1-4d3b-a3f5-ef19b5a7633b' },
  },
  { nombre: 'editar empleado', tipo: UpdateEmpleadoDto, datos: {} },
  {
    nombre: 'crear usuario interno',
    tipo: CreateUsuarioInternoDto,
    datos: {
      ...datosUsuario,
      username: 'ana',
      contrasena: 'ClavePrueba123',
      rol_ids: [1],
    },
  },
  {
    nombre: 'registrar empleado',
    tipo: RegisterEmpleadoDto,
    datos: { ...datosUsuario, rol_id: 1 },
  },
];

describe.each(casos)('Area opcional y libre al $nombre', ({ tipo, datos }) => {
  it.each([
    undefined,
    null,
    'gerencia',
    'despacho',
    'Investigación y desarrollo',
    'x'.repeat(100),
  ])('acepta area=%j', (area) => {
    const dto = plainToInstance(tipo, {
      ...datos,
      ...(area === undefined ? {} : { area }),
    });
    expect(validateSync(dto)).toEqual([]);
  });

  it.each([123, {}, 'x'.repeat(101)])('rechaza area=%j', (area) => {
    const errores = validateSync(plainToInstance(tipo, { ...datos, area }));
    expect(errores.map((error) => error.property)).toEqual(['area']);
  });
});
