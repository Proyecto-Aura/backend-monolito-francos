import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  REFRESH_TOKEN_EXPIRES_IN_DAYS: number;
  FRONTEND_STORE_URL: string;
  FRONTEND_PORTAL_URL: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM: string;
  S3_ENDPOINT?: string;
  S3_REGION: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_FORCE_PATH_STYLE: boolean;
  S3_BUCKET_DOCS: string;
  S3_BUCKET_MEDIA: string;
  MEDIA_BASE_URL: string;
  CATALOGO_PUBLICO_RATE_LIMIT: number;
  CATALOGO_PUBLICO_RATE_TTL_MS: number;
}

const envSchema = joi
  .object<EnvVars>({
    PORT: joi.number().default(3000),
    DATABASE_URL: joi.string().required(),
    JWT_SECRET: joi.string().required(),
    JWT_ACCESS_EXPIRES_IN: joi.string().default('40m'),
    REFRESH_TOKEN_EXPIRES_IN_DAYS: joi.number().default(7),
    FRONTEND_STORE_URL: joi.string().required(),
    FRONTEND_PORTAL_URL: joi.string().required(),
    SMTP_HOST: joi.string().required(),
    SMTP_PORT: joi.number().default(587),
    SMTP_SECURE: joi.boolean().default(false),
    SMTP_USER: joi.string().required(),
    SMTP_PASS: joi.string().required(),
    SMTP_FROM: joi.string().required(),
    S3_ENDPOINT: joi.string().optional(),
    S3_REGION: joi.string().default('us-east-1'),
    S3_ACCESS_KEY_ID: joi.string().when('S3_ENDPOINT', {
      is: joi.exist(),
      then: joi.required(),
      otherwise: joi.optional(),
    }),
    S3_SECRET_ACCESS_KEY: joi.string().when('S3_ENDPOINT', {
      is: joi.exist(),
      then: joi.required(),
      otherwise: joi.optional(),
    }),
    S3_FORCE_PATH_STYLE: joi.boolean().default(false),
    S3_BUCKET_DOCS: joi.string().required(),
    S3_BUCKET_MEDIA: joi.string().required(),
    MEDIA_BASE_URL: joi.string().default('/media'),
    // Rate limit del catálogo público (Portal B): peticiones por IP y ventana.
    CATALOGO_PUBLICO_RATE_LIMIT: joi.number().integer().min(1).default(60),
    CATALOGO_PUBLICO_RATE_TTL_MS: joi.number().integer().min(1).default(60000),
  })
  .and('S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY')
  .unknown(true);

const validationResult = envSchema.validate(process.env);

if (validationResult.error) {
  throw new Error(`Config validation error: ${validationResult.error.message}`);
}

const envVars = validationResult.value;

export const envs = {
  port: envVars.PORT,
  databaseUrl: envVars.DATABASE_URL,
  jwtSecret: envVars.JWT_SECRET,
  jwtAccessExpiresIn: envVars.JWT_ACCESS_EXPIRES_IN,
  refreshTokenExpiresInDays: envVars.REFRESH_TOKEN_EXPIRES_IN_DAYS,
  frontendStoreUrl: envVars.FRONTEND_STORE_URL,
  frontendPortalUrl: envVars.FRONTEND_PORTAL_URL,
  smtpHost: envVars.SMTP_HOST,
  smtpPort: envVars.SMTP_PORT,
  smtpSecure: envVars.SMTP_SECURE,
  smtpUser: envVars.SMTP_USER,
  smtpPass: envVars.SMTP_PASS,
  smtpFrom: envVars.SMTP_FROM,
  s3Endpoint: envVars.S3_ENDPOINT,
  s3Region: envVars.S3_REGION,
  s3AccessKeyId: envVars.S3_ACCESS_KEY_ID,
  s3SecretAccessKey: envVars.S3_SECRET_ACCESS_KEY,
  s3ForcePathStyle: envVars.S3_FORCE_PATH_STYLE,
  s3BucketDocs: envVars.S3_BUCKET_DOCS,
  s3BucketMedia: envVars.S3_BUCKET_MEDIA,
  mediaBaseUrl: envVars.MEDIA_BASE_URL,
  catalogoPublicoRateLimit: envVars.CATALOGO_PUBLICO_RATE_LIMIT,
  catalogoPublicoRateTtlMs: envVars.CATALOGO_PUBLICO_RATE_TTL_MS,
};
