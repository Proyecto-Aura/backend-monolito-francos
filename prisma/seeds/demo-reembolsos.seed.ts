import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  EstadoPedido,
  EstadoReembolso,
  MetodoPago,
  OrigenPedido,
  PrismaClient,
  TipoDocumento,
  TipoEntrega,
  UnidadMedidaPresentacion,
} from '@prisma/client';

// SOLO PARA DESARROLLO (se carga con SEED_DEMO=true). Las solicitudes de
// reembolso las registra el cliente desde su portal (HU-B-014), que todavía no
// existe; para probar la gestión de reembolsos (HU-A-011) se crean unas de
// ejemplo, una por estado, con sus clientes, pedidos y pagos. Es repetible: si
// ya existen, no hace nada.
const SKU_DEMO = 'DEMO-CHIFLES-250';
const PRECIO = 8.5;

const CLIENTES = [
  {
    dni: '70000001',
    nombres: 'Rosa Elena',
    paterno: 'Quispe',
    materno: 'Huamán',
    conCuenta: true,
  },
  {
    dni: '70000002',
    nombres: 'Jorge Luis',
    paterno: 'Ramírez',
    materno: 'Soto',
    conCuenta: false,
  },
  {
    dni: '70000003',
    nombres: 'María Fernanda',
    paterno: 'Torres',
    materno: 'Vega',
    conCuenta: false,
  },
  {
    dni: '70000004',
    nombres: 'Carlos Alberto',
    paterno: 'Mendoza',
    materno: 'Ríos',
    conCuenta: false,
  },
  {
    dni: '70000005',
    nombres: 'Lucía',
    paterno: 'Paredes',
    materno: 'Castro',
    conCuenta: false,
  },
];

const SOLICITUDES: {
  cliente: number;
  cantidad: number;
  metodo: MetodoPago;
  estado: EstadoReembolso;
  diasAtras: number;
  motivo: string;
  evidencia: string | null;
  motivoRechazo?: string;
}[] = [
  {
    cliente: 0,
    cantidad: 200,
    metodo: MetodoPago.culqi,
    estado: EstadoReembolso.pendiente,
    diasAtras: 1,
    motivo:
      'El pedido llegó con 12 packs rotos y el cliente solicita la devolución del importe pagado.',
    evidencia: 'evidencia-packs-rotos.pdf',
  },
  {
    cliente: 1,
    cantidad: 20,
    metodo: MetodoPago.culqi,
    estado: EstadoReembolso.pendiente,
    diasAtras: 2,
    motivo: 'Se cobró dos veces la misma operación de Culqi.',
    evidencia: null,
  },
  {
    cliente: 2,
    cantidad: 30,
    metodo: MetodoPago.efectivo,
    estado: EstadoReembolso.aprobado,
    diasAtras: 3,
    motivo: 'Entrega incompleta: faltaron 4 packs de canchita serrana.',
    evidencia: 'acta-recepcion.pdf',
  },
  {
    cliente: 3,
    cantidad: 164,
    metodo: MetodoPago.culqi,
    estado: EstadoReembolso.reembolsado,
    diasAtras: 4,
    motivo: 'Pedido cancelado por el cliente antes del despacho.',
    evidencia: 'correo-cancelacion.pdf',
  },
  {
    cliente: 4,
    cantidad: 42,
    metodo: MetodoPago.culqi,
    estado: EstadoReembolso.rechazado,
    diasAtras: 6,
    motivo: 'Solicita devolución fuera del plazo de 48 horas.',
    evidencia: 'chat-cliente.pdf',
    motivoRechazo:
      'La solicitud excede el plazo de 48 horas establecido en las condiciones de venta.',
  },
];

const codigo = (prefijo: string, id: number) =>
  `${prefijo}-${String(id).padStart(6, '0')}`;

const haceDias = (dias: number) => new Date(Date.now() - dias * 86_400_000);

// PDF de una página con un texto, para que la evidencia de ejemplo se pueda abrir.
function pdfDeEjemplo(texto: string): Buffer {
  const contenido = `BT /F1 14 Tf 72 720 Td (${texto}) Tj ET`;
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = objetos.map((objeto, i) => {
    const offset = pdf.length;
    pdf += `${i + 1} 0 obj\n${objeto}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)
    .join('');
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

// Sube la evidencia al bucket de documentos (MinIO en local). Sin bucket
// configurado solo queda la llave y el enlace no abrirá nada.
async function subirEvidencia(key: string, texto: string) {
  const bucket = process.env.S3_BUCKET_DOCS;
  if (!bucket) return;

  const s3 = new S3Client({
    region: process.env.S3_REGION ?? 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    ...(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          },
        }
      : {}),
  });

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: pdfDeEjemplo(texto),
        ContentType: 'application/pdf',
      }),
    );
  } catch (error) {
    console.log(
      `No se pudo subir la evidencia de ejemplo ${key}: ${(error as Error).message}`,
    );
  }
}

async function siguienteId(prisma: PrismaClient, tabla: string) {
  const [{ nextval }] = await prisma.$queryRawUnsafe<{ nextval: bigint }[]>(
    `SELECT nextval(pg_get_serial_sequence('commerce.${tabla}', 'id')) AS nextval`,
  );
  return Number(nextval);
}

export async function seedDemoReembolsos(prisma: PrismaClient) {
  if (process.env.SEED_DEMO !== 'true') {
    return;
  }

  if (
    await prisma.productoPresentacion.findUnique({ where: { sku: SKU_DEMO } })
  ) {
    console.log('Demo de reembolsos ya cargada');
    return;
  }

  const categoria = await prisma.categoria.findFirst({
    where: { nombre: 'Chifles' },
  });
  const presentacion = await prisma.presentacion.findFirst({
    where: { cantidad: 250, unidad_medida: UnidadMedidaPresentacion.gr },
  });
  const admin = await prisma.user.findFirst({ where: { username: 'admin' } });

  if (!categoria || !presentacion) {
    console.log(
      'Faltan la categoría Chifles o la presentación de 250 gr; se omite la demo de reembolsos',
    );
    return;
  }

  const productoPresentacion = await prisma.productoPresentacion.create({
    data: {
      sku: SKU_DEMO,
      precio_unitario: PRECIO,
      producto: {
        create: {
          categoria_id: categoria.id,
          nombre: 'Chifles clásicos (demo)',
        },
      },
      presentacion: { connect: { id: presentacion.id } },
      producto_terminado: { create: {} },
    },
  });

  const clientes: { id: string }[] = [];
  for (const c of CLIENTES) {
    const persona = await prisma.persona.upsert({
      where: { numero_documento: c.dni },
      update: {},
      create: {
        nombres: c.nombres,
        apellido_paterno: c.paterno,
        apellido_materno: c.materno,
        tipo_documento: TipoDocumento.dni,
        numero_documento: c.dni,
        direccion: 'Av. La Marina 1450, San Miguel',
      },
    });

    // Un cliente con cuenta en el portal, para ver la notificación (RF-A045).
    if (c.conCuenta) {
      await prisma.user.upsert({
        where: { persona_id: persona.id },
        update: {},
        create: {
          persona_id: persona.id,
          email: `cliente.${c.dni}@francos.test`,
          username: `cliente_${c.dni}`,
          contrasena: 'sin-acceso-demo',
          email_verificado: true,
        },
      });
    }

    clientes.push(
      await prisma.cliente.upsert({
        where: { persona_id: persona.id },
        update: {},
        create: {
          persona_id: persona.id,
          tipo_cliente: 'persona_natural',
          categoria_cliente: 'minorista',
        },
      }),
    );
  }

  for (const s of SOLICITUDES) {
    const total = s.cantidad * PRECIO;
    const fecha = haceDias(s.diasAtras);
    const pedidoId = await siguienteId(prisma, 'pedido');

    const pedido = await prisma.pedido.create({
      data: {
        id: pedidoId,
        codigo: codigo('PED', pedidoId),
        cliente_id: clientes[s.cliente].id,
        origen: OrigenPedido.manual,
        estado: EstadoPedido.entregado,
        tipo_entrega: TipoEntrega.delivery,
        direccion_entrega: 'Av. La Marina 1450, San Miguel',
        total,
        created_at: haceDias(s.diasAtras + 2),
        detalles: {
          create: {
            producto_presentacion_id: productoPresentacion.id,
            cantidad: s.cantidad,
            precio_unitario: PRECIO,
            precio_aplicado: PRECIO,
            subtotal: total,
          },
        },
        pago: {
          create: {
            metodo_pago: s.metodo,
            monto: total,
            numero_operacion:
              s.metodo === MetodoPago.culqi ? `chr_demo_${pedidoId}` : null,
            fecha_pago: haceDias(s.diasAtras + 2),
          },
        },
      },
      include: { pago: true },
    });

    const reembolsoId = await siguienteId(prisma, 'reembolso');
    const resuelta = s.estado !== EstadoReembolso.pendiente;
    const codigoSolicitud = codigo('SOL', reembolsoId);

    const evidenciaKey = s.evidencia
      ? `reembolsos/${codigoSolicitud}/${s.evidencia}`
      : null;
    if (evidenciaKey) {
      await subirEvidencia(
        evidenciaKey,
        `Evidencia de ejemplo - solicitud ${codigoSolicitud}`,
      );
    }

    await prisma.reembolso.create({
      data: {
        id: reembolsoId,
        codigo: codigoSolicitud,
        pago_id: pedido.pago!.id,
        monto: total,
        motivo_cliente: s.motivo,
        evidencia_key: evidenciaKey,
        estado: s.estado,
        motivo_rechazo: s.motivoRechazo ?? null,
        resuelto_por: resuelta ? (admin?.id ?? null) : null,
        fecha_solicitud: fecha,
        fecha_resolucion: resuelta ? haceDias(s.diasAtras - 0.5) : null,
      },
    });
  }

  console.log(`Demo de reembolsos lista (${SOLICITUDES.length} solicitudes)`);
}
