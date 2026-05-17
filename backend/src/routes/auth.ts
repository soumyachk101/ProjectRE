import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { sendOtp, verifyOtp } from '../services/otp';
import { makeTokenPair, verifyToken } from '../lib/jwt';

export const authRouter = Router();

const RegisterSchema = z.object({
  phone: z.string().min(10).max(15),
  name: z.string().min(1).max(100).optional(),
  vehicle_type: z.enum(['two_wheeler', 'three_wheeler', 'four_wheeler']).optional(),
});

const SendOtpSchema = z.object({
  phone: z.string().min(10).max(15),
});

const LoginSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().length(6),
});

const RefreshSchema = z.object({
  refresh_token: z.string(),
});

authRouter.post('/register', async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ detail: parsed.error.flatten() });
    return;
  }
  const { phone, name, vehicle_type } = parsed.data;
  const user = await prisma.user.upsert({
    where: { phone },
    update: { name: name ?? undefined, vehicleType: vehicle_type ?? undefined },
    create: { phone, name: name ?? null, vehicleType: vehicle_type ?? null },
  });
  res.status(201).json({ id: user.id, phone: user.phone, name: user.name, role: user.role, vehicle_type: user.vehicleType });
});

authRouter.post('/send-otp', async (req, res) => {
  const parsed = SendOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ detail: parsed.error.flatten() });
    return;
  }
  await sendOtp(parsed.data.phone);
  res.json({ message: 'OTP sent' });
});

authRouter.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ detail: parsed.error.flatten() });
    return;
  }
  const { phone, otp } = parsed.data;
  const valid = await verifyOtp(phone, otp);
  if (!valid) {
    res.status(401).json({ detail: 'Invalid OTP' });
    return;
  }
  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: { phone },
  });
  res.json(makeTokenPair(user.id));
});

authRouter.post('/refresh', async (req, res) => {
  const parsed = RefreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ detail: parsed.error.flatten() });
    return;
  }
  try {
    const payload = verifyToken(parsed.data.refresh_token);
    if (payload.type !== 'refresh') {
      res.status(401).json({ detail: 'Invalid token type' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      res.status(404).json({ detail: 'User not found' });
      return;
    }
    res.json(makeTokenPair(user.id));
  } catch {
    res.status(401).json({ detail: 'Invalid refresh token' });
  }
});
