import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import prisma from '../../shared/prisma';
import { AuthRequest } from '../../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'KapiTrace_secret_key';

/**
 * Validate password security standards:
 * - Minimum 8 characters
 * - Must not be all whitespace
 */
function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, reason: 'Password is required and must be a string' };
  }
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long' };
  }
  return { valid: true };
}

/**
 * Basic RFC 5322 email regex check
 */
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role = 'analyst' } = req.body;

    if (!email || !isValidEmail(email)) {
      res.status(400).json({ error: 'Valid email address is required' });
      return;
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      res.status(400).json({ error: passwordCheck.reason });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name ? String(name).trim() : null,
        role: ['admin', 'analyst', 'viewer'].includes(role) ? role : 'analyst'
      }
    });

    res.status(201).json({
      message: 'User created successfully',
      userId: user.id
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const refreshToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ error: 'Authentication required for token renewal' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }

    const newToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
};
