import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { SECURITY } from '@/lib/constants';

export async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(SECURITY.BCRYPT_ROUNDS);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    console.error('Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
}

export async function verifyPassword(password, hashedPassword) {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error('Password verification error:', error);
    throw new Error('Failed to verify password');
  }
}

export function generateToken(payload) {
  try {
    return jwt.sign(
      payload,
      process.env.JWT_SECRET || 'fallback-secret-change-in-production',
      { expiresIn: process.env.JWT_EXPIRY || '1h' }
    );
  } catch (error) {
    console.error('Token generation error:', error);
    throw new Error('Failed to generate token');
  }
}

export function verifyToken(token) {
  try {
    return jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret-change-in-production'
    );
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

export function isAccountLocked(lockedUntil) {
  if (!lockedUntil) return false;
  return new Date(lockedUntil) > new Date();
}

export function calculateLockTime() {
  const lockTime = new Date();
  lockTime.setMinutes(lockTime.getMinutes() + SECURITY.LOCK_TIME_MINUTES);
  return lockTime;
}

export function sanitizeUserData(user) {
  const { password_hash, ...safeUser } = user;
  return safeUser;
}