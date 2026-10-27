// Donde vive el archivo de evidencia que el cliente adjunta a su solicitud.
export abstract class EvidenciaReembolsoService {
  // Enlace temporal para que el operador de ventas descargue la evidencia.
  abstract urlDescarga(key: string): Promise<string>;
  // Guarda la evidencia que el cliente adjunta al solicitar el reembolso.
  abstract subir(key: string, contenido: Buffer, tipo: string): Promise<void>;
  // Quita una evidencia que quedó sin solicitud (el registro falló).
  abstract borrar(key: string): Promise<void>;
}
