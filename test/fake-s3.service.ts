import type { StorageBucket } from '../src/infrastructure/storage/s3.service';

// Doble en memoria de S3Service: en CI no hay MinIO ni credenciales reales
// (decisión del equipo de CI/CD), así que los e2e que suben archivos reemplazan
// el servicio completo con `.overrideProvider(S3Service).useValue(...)` en vez
// de pegarle a un bucket de verdad.
export class FakeS3Service {
  private readonly objetos = new Map<
    string,
    { body: Buffer; contentType?: string; cacheControl?: string }
  >();

  private clave(bucket: StorageBucket, key: string): string {
    return `${bucket}:${key}`;
  }

  upload(
    bucket: StorageBucket,
    key: string,
    body: Buffer,
    contentType?: string,
    cacheControl?: string,
  ): Promise<void> {
    this.objetos.set(this.clave(bucket, key), {
      body,
      contentType,
      cacheControl,
    });
    return Promise.resolve();
  }

  delete(bucket: StorageBucket, key: string): Promise<void> {
    this.objetos.delete(this.clave(bucket, key));
    return Promise.resolve();
  }

  getPresignedUrl(bucket: StorageBucket, key: string): Promise<string> {
    return Promise.resolve(`https://fake-s3.test/${bucket}/${key}`);
  }

  existe(bucket: StorageBucket, key: string): boolean {
    return this.objetos.has(this.clave(bucket, key));
  }

  // Lo que se guardó con `upload`, para comprobar tipo y caché.
  objeto(bucket: StorageBucket, key: string) {
    return this.objetos.get(this.clave(bucket, key));
  }
}
