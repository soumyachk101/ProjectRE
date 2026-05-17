import { redis } from '../redis';
import { config } from '../config';

const key = (phone: string) => `otp:${phone}`;

export async function sendOtp(phone: string): Promise<string> {
  const code = config.otp.mockMode ? config.otp.mockCode : String(Math.floor(100000 + Math.random() * 900000));
  await redis.setex(key(phone), config.otp.ttlSeconds, code);
  // In production: call SMS provider here
  return code;
}

export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  if (config.otp.mockMode) return otp === config.otp.mockCode;
  const stored = await redis.get(key(phone));
  if (!stored) return false;
  const valid = stored === otp;
  if (valid) await redis.del(key(phone));
  return valid;
}
