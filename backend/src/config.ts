import dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    console.error(`FATAL: Missing required env var ${key}`);
    process.exit(1);
  }
  return val;
}

export const config = {
  port: parseInt(process.env.PORT ?? '8000', 10),
  databaseUrl: requireEnv('DATABASE_URL'),
  redisUrl: requireEnv('REDIS_URL'),
  minio: {
    endpoint: process.env.MINIO_ENDPOINT ?? 'localhost',
    port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
    accessKey: requireEnv('MINIO_ACCESS_KEY'),
    secretKey: requireEnv('MINIO_SECRET_KEY'),
    bucket: process.env.MINIO_BUCKET ?? 'roadsense-sensor-data',
    useSSL: process.env.MINIO_SECURE === 'true',
  },
  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },
  otp: {
    mockMode: process.env.OTP_MOCK_MODE === 'true',
    mockCode: '123456',
    ttlSeconds: 300,
  },
  mlServiceUrl: process.env.ML_SERVICE_URL ?? 'http://localhost:8001',
} as const;
