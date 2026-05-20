import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JwtPayload {
  sub: string;
  type: 'access' | 'refresh';
}

export function signAccess(userId: string): string {
  return jwt.sign({ sub: userId, type: 'access' }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
}

export function signRefresh(userId: string): string {
  return jwt.sign({ sub: userId, type: 'refresh' }, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
}

export function makeTokenPair(userId: string) {
  const accessToken = signAccess(userId);
  const refreshToken = signRefresh(userId);
  const expiresInSeconds = parseDuration(config.jwt.expiresIn);
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'bearer',
    expires_in: expiresInSeconds,
  };
}

function parseDuration(s: string): number {
  const match = s.match(/^(\d+)([smhd])$/);
  if (!match) return 86400;
  const n = parseInt(match[1]);
  switch (match[2]) {
    case 's': return n;
    case 'm': return n * 60;
    case 'h': return n * 3600;
    case 'd': return n * 86400;
    default: return 86400;
  }
}
