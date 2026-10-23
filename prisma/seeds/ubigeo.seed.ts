import { PrismaClient } from '@prisma/client';

// Catálogo de ubicación según el ubigeo del INEI (el id es el código oficial).
// Cobertura actual: Lima Metropolitana y la Provincia Constitucional del Callao.
// Para ampliar la cobertura basta con agregar departamentos, provincias o
// distritos aquí: el seed es idempotente (upsert por código).
interface DistritoSeed {
  id: string;
  nombre: string;
}

interface ProvinciaSeed {
  id: string;
  nombre: string;
  distritos: DistritoSeed[];
}

interface DepartamentoSeed {
  id: string;
  nombre: string;
  provincias: ProvinciaSeed[];
}

const CALLAO: DepartamentoSeed = {
  id: '07',
  nombre: 'Callao',
  provincias: [
    {
      id: '0701',
      nombre: 'Callao',
      distritos: [
        { id: '070101', nombre: 'Callao' },
        { id: '070102', nombre: 'Bellavista' },
        { id: '070103', nombre: 'Carmen de la Legua Reynoso' },
        { id: '070104', nombre: 'La Perla' },
        { id: '070105', nombre: 'La Punta' },
        { id: '070106', nombre: 'Ventanilla' },
        { id: '070107', nombre: 'Mi Perú' },
      ],
    },
  ],
};

const LIMA: DepartamentoSeed = {
  id: '15',
  nombre: 'Lima',
  provincias: [
    {
      id: '1501',
      nombre: 'Lima',
      distritos: [
        { id: '150101', nombre: 'Lima' },
        { id: '150102', nombre: 'Ancón' },
        { id: '150103', nombre: 'Ate' },
        { id: '150104', nombre: 'Barranco' },
        { id: '150105', nombre: 'Breña' },
        { id: '150106', nombre: 'Carabayllo' },
        { id: '150107', nombre: 'Chaclacayo' },
        { id: '150108', nombre: 'Chorrillos' },
        { id: '150109', nombre: 'Cieneguilla' },
        { id: '150110', nombre: 'Comas' },
        { id: '150111', nombre: 'El Agustino' },
        { id: '150112', nombre: 'Independencia' },
        { id: '150113', nombre: 'Jesús María' },
        { id: '150114', nombre: 'La Molina' },
        { id: '150115', nombre: 'La Victoria' },
        { id: '150116', nombre: 'Lince' },
        { id: '150117', nombre: 'Los Olivos' },
        { id: '150118', nombre: 'Lurigancho' },
        { id: '150119', nombre: 'Lurín' },
        { id: '150120', nombre: 'Magdalena del Mar' },
        { id: '150121', nombre: 'Pueblo Libre' },
        { id: '150122', nombre: 'Miraflores' },
        { id: '150123', nombre: 'Pachacámac' },
        { id: '150124', nombre: 'Pucusana' },
        { id: '150125', nombre: 'Puente Piedra' },
        { id: '150126', nombre: 'Punta Hermosa' },
        { id: '150127', nombre: 'Punta Negra' },
        { id: '150128', nombre: 'Rímac' },
        { id: '150129', nombre: 'San Bartolo' },
        { id: '150130', nombre: 'San Borja' },
        { id: '150131', nombre: 'San Isidro' },
        { id: '150132', nombre: 'San Juan de Lurigancho' },
        { id: '150133', nombre: 'San Juan de Miraflores' },
        { id: '150134', nombre: 'San Luis' },
        { id: '150135', nombre: 'San Martín de Porres' },
        { id: '150136', nombre: 'San Miguel' },
        { id: '150137', nombre: 'Santa Anita' },
        { id: '150138', nombre: 'Santa María del Mar' },
        { id: '150139', nombre: 'Santa Rosa' },
        { id: '150140', nombre: 'Santiago de Surco' },
        { id: '150141', nombre: 'Surquillo' },
        { id: '150142', nombre: 'Villa El Salvador' },
        { id: '150143', nombre: 'Villa María del Triunfo' },
      ],
    },
  ],
};

const UBIGEO: DepartamentoSeed[] = [CALLAO, LIMA];

export async function seedUbigeo(prisma: PrismaClient) {
  let distritos = 0;
  for (const departamento of UBIGEO) {
    await prisma.departamento.upsert({
      where: { id: departamento.id },
      update: { nombre: departamento.nombre },
      create: { id: departamento.id, nombre: departamento.nombre },
    });
    for (const provincia of departamento.provincias) {
      await prisma.provincia.upsert({
        where: { id: provincia.id },
        update: { nombre: provincia.nombre },
        create: {
          id: provincia.id,
          nombre: provincia.nombre,
          departamento_id: departamento.id,
        },
      });
      for (const distrito of provincia.distritos) {
        await prisma.distrito.upsert({
          where: { id: distrito.id },
          update: { nombre: distrito.nombre },
          create: {
            id: distrito.id,
            nombre: distrito.nombre,
            provincia_id: provincia.id,
          },
        });
        distritos++;
      }
    }
  }
  console.log(
    `Ubigeo listo (${UBIGEO.length} departamentos, ${distritos} distritos)`,
  );
}
