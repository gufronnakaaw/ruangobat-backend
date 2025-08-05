import crypto from 'crypto';
import { AES, enc } from 'crypto-js';

export function encryptString(strings: string, key: string): string {
  return AES.encrypt(strings, key).toString();
}

export function decryptString(encrypted: string, key: string): string {
  return AES.decrypt(encrypted, key).toString(enc.Utf8);
}

export function hashString(string: string, key: string): string {
  return crypto.createHmac('sha256', key).update(string).digest('hex');
}

export function generateToken(expiresInSec = 300): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSec;
  const signature = crypto
    .createHmac('sha256', process.env.ENCRYPT_KEY)
    .update(String(expiresAt))
    .digest('hex');

  return `${expiresAt}:${signature}`;
}

export function verifyToken(token: string): boolean {
  const [expiresStr, signature] = token.split(':');
  const expiresAt = parseInt(expiresStr, 10);

  if (!expiresAt || !signature) return false;
  if (Date.now() / 1000 > expiresAt) return false;

  const expectedSig = crypto
    .createHmac('sha256', process.env.ENCRYPT_KEY)
    .update(String(expiresAt))
    .digest('hex');

  return expectedSig === signature;
}
