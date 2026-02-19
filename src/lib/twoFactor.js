import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { query } from './db';

export async function generateTwoFactorSecret(userId, username) {
  const secret = speakeasy.generateSecret({
    name: `SurgiPartner (${username})`,
    issuer: 'SurgiPartner'
  });
  
  // Store secret in database
  await query(
    `UPDATE users SET two_factor_secret = ? WHERE id = ?`,
    [secret.base32, userId]
  );
  
  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
  
  return {
    secret: secret.base32,
    qrCode: qrCodeUrl
  };
}

export async function verifyTwoFactorToken(userId, token) {
  try {
    const [user] = await query(
      `SELECT two_factor_secret FROM users WHERE id = ?`,
      [userId]
    );
    
    if (!user || !user.two_factor_secret) {
      return false;
    }
    
    return speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps (60 seconds total)
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    return false;
  }
}

export async function enableTwoFactor(userId) {
  await query(
    `UPDATE users SET two_factor_enabled = TRUE WHERE id = ?`,
    [userId]
  );
}

export async function disableTwoFactor(userId) {
  await query(
    `UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL WHERE id = ?`,
    [userId]
  );
}

export async function isTwoFactorEnabled(userId) {
  const [user] = await query(
    `SELECT two_factor_enabled FROM users WHERE id = ?`,
    [userId]
  );
  return user?.two_factor_enabled || false;
}
