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
  })
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
};
