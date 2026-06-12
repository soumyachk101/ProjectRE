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
  try {
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
  } catch (err) {
    console.error('[Register]', err);
    res.status(500).json({ detail: 'Registration failed. Please try again.' });
  }
});

authRouter.post('/send-otp', async (req, res) => {
  try {
    const parsed = SendOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ detail: parsed.error.flatten() });
      return;
    }
    await sendOtp(parsed.data.phone);
    res.json({ message: 'OTP sent' });
  } catch (err) {
    console.error('[SendOTP]', err);
    res.status(500).json({ detail: 'Failed to send OTP. Please try again.' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
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
    // SECURITY: do NOT auto-create a user on login. Unknown phones must sign up first.
    // Previously this route used prisma.user.upsert with create: { phone }, which
    // combined with OTP_MOCK_MODE=true and the hard-coded mock code let any caller
    // claim a JWT for any phone in a single request.
    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, isActive: true },
    });
    if (!user) {
      res.status(404).json({ detail: 'User not registered. Please sign up first.' });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ detail: 'Account disabled' });
      return;
    }
    res.json(makeTokenPair(user.id));
  } catch (err) {
    console.error('[Login]', err);
    res.status(500).json({ detail: 'Login failed. Please try again.' });
  }
});

authRouter.post('/refresh', async (req, res) => {
  try {
    const parsed = RefreshSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ detail: parsed.error.flatten() });
      return;
    }
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
  } catch (err: any) {
    if (err?.message === 'Invalid token type' || err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
      res.status(401).json({ detail: 'Invalid refresh token' });
      return;
    }
    console.error('[Refresh]', err);
    res.status(500).json({ detail: 'Token refresh failed' });
  }
});
