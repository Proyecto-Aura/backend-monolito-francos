import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { envs } from '../../config/envs';

export type StorageBucket = 'docs' | 'media';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly buckets: Record<StorageBucket, string> = {
    docs: envs.s3BucketDocs,
    media: envs.s3BucketMedia,
  };

  constructor() {
    this.client = new S3Client({
      region: envs.s3Region,
      ...(envs.s3Endpoint && {
        endpoint: envs.s3Endpoint,
        forcePathStyle: envs.s3ForcePathStyle,
        credentials: {
          accessKeyId: envs.s3AccessKeyId!,
          secretAccessKey: envs.s3SecretAccessKey!,
        },
      }),
    });
  }

  async onModuleInit() {
    for (const [name, bucket] of Object.entries(this.buckets) as [
      StorageBucket,
      string,
    ][]) {
      try {
        await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
      } catch (error) {
        this.logger.warn(
          `El bucket "${bucket}" (${name}) no existe o no es accesible: ${(error as Error).message}`,
        );
      }
    }
  }

  async upload(
    bucket: StorageBucket,
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.buckets[bucket],
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async delete(bucket: StorageBucket, key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.buckets[bucket], Key: key }),
    );
  }

  async getPresignedUrl(
    bucket: StorageBucket,
    key: string,
    expiresInSeconds = 300,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.buckets[bucket],
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}
