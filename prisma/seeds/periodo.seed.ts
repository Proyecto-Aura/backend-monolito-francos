import { PrismaClient } from '@prisma/client';

interface PeriodoSeed {
  frecuencia_nombre: string;
  numero: number;
  codigo: string;
  nombre: string;
  mes_fin: number;
}

const PERIODOS: PeriodoSeed[] = [
  {
    frecuencia_nombre: 'Mensual',
    numero: 1,
    codigo: 'M1',
    nombre: 'Enero',
    mes_fin: 1,
  },
  {
    frecuencia_nombre: 'Mensual',
    numero: 2,
    codigo: 'M2',
    nombre: 'Febrero',
    mes_fin: 2,
  },
  {
    frecuencia_nombre: 'Mensual',
    numero: 3,
    codigo: 'M3',
    nombre: 'Marzo',
    mes_fin: 3,
  },
  {
    frecuencia_nombre: 'Mensual',
    numero: 4,
    codigo: 'M4',
    nombre: 'Abril',
    mes_fin: 4,
  },
  {
    frecuencia_nombre: 'Mensual',
    numero: 5,
    codigo: 'M5',
    nombre: 'Mayo',
    mes_fin: 5,
  },
  {
    frecuencia_nombre: 'Mensual',
    numero: 6,
    codigo: 'M6',
    nombre: 'Junio',
    mes_fin: 6,
  },
  {
    frecuencia_nombre: 'Mensual',
    numero: 7,
    codigo: 'M7',
    nombre: 'Julio',
    mes_fin: 7,
  },
  {
    frecuencia_nombre: 'Mensual',
    numero: 8,
    codigo: 'M8',
    nombre: 'Agosto',
    mes_fin: 8,
  },
  {
    frecuencia_nombre: 'Mensual',
    numero: 9,
    codigo: 'M9',
    nombre: 'Septiembre',
    mes_fin: 9,
  },
  {
    frecuencia_nombre: 'Mensual',
    numero: 10,
    codigo: 'M10',
    nombre: 'Octubre',
    mes_fin: 10,
  },
  {
    frecuencia_nombre: 'Mensual',
    numero: 11,
    codigo: 'M11',
    nombre: 'Noviembre',
    mes_fin: 11,
  },
  {
    frecuencia_nombre: 'Mensual',
    numero: 12,
    codigo: 'M12',
    nombre: 'Diciembre',
    mes_fin: 12,
  },
  {
    frecuencia_nombre: 'Bimestral',
    numero: 1,
    codigo: 'B1',
    nombre: 'Bimestre 1',
    mes_fin: 2,
  },
  {
    frecuencia_nombre: 'Bimestral',
    numero: 2,
    codigo: 'B2',
    nombre: 'Bimestre 2',
    mes_fin: 4,
  },
  {
    frecuencia_nombre: 'Bimestral',
    numero: 3,
    codigo: 'B3',
    nombre: 'Bimestre 3',
    mes_fin: 6,
  },
  {
    frecuencia_nombre: 'Bimestral',
    numero: 4,
    codigo: 'B4',
    nombre: 'Bimestre 4',
    mes_fin: 8,
  },
  {
    frecuencia_nombre: 'Bimestral',
    numero: 5,
    codigo: 'B5',
    nombre: 'Bimestre 5',
    mes_fin: 10,
  },
  {
    frecuencia_nombre: 'Bimestral',
    numero: 6,
    codigo: 'B6',
    nombre: 'Bimestre 6',
    mes_fin: 12,
  },
  {
    frecuencia_nombre: 'Trimestral',
    numero: 1,
    codigo: 'T1',
    nombre: 'Trimestre 1',
    mes_fin: 3,
  },
  {
    frecuencia_nombre: 'Trimestral',
    numero: 2,
    codigo: 'T2',
    nombre: 'Trimestre 2',
    mes_fin: 6,
  },
  {
    frecuencia_nombre: 'Trimestral',
    numero: 3,
    codigo: 'T3',
    nombre: 'Trimestre 3',
    mes_fin: 9,
  },
  {
    frecuencia_nombre: 'Trimestral',
    numero: 4,
    codigo: 'T4',
    nombre: 'Trimestre 4',
    mes_fin: 12,
  },
  {
    frecuencia_nombre: 'Semestral',
    numero: 1,
    codigo: 'S1',
    nombre: 'Semestre 1',
    mes_fin: 6,
  },
  {
    frecuencia_nombre: 'Semestral',
    numero: 2,
    codigo: 'S2',
    nombre: 'Semestre 2',
    mes_fin: 12,
  },
  {
    frecuencia_nombre: 'Anual',
    numero: 1,
    codigo: 'A1',
    nombre: 'Anual',
    mes_fin: 12,
  },
];

export async function seedPeriodo(prisma: PrismaClient) {
  for (const item of PERIODOS) {
    const frecuencia = await prisma.frecuenciaMedicion.findUniqueOrThrow({
      where: { nombre: item.frecuencia_nombre },
    });

    await prisma.periodo.upsert({
      where: { codigo: item.codigo },
      update: {
        frecuencia_id: frecuencia.id,
        numero: item.numero,
        nombre: item.nombre,
        mes_fin: item.mes_fin,
      },
      create: {
        frecuencia_id: frecuencia.id,
        numero: item.numero,
        codigo: item.codigo,
        nombre: item.nombre,
        mes_fin: item.mes_fin,
        estado: true,
      },
    });
    console.log(`Periodo "${item.codigo}" listo`);
  }
}
