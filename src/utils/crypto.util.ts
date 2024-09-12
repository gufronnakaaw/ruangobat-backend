import { AES, enc } from 'crypto-js';

export function encryptPassword(password: string, key: string): string {
  return AES.encrypt(password, key).toString();
}

export function decryptPassword(encrypted: string, key: string): string {
  return AES.decrypt(encrypted, key).toString(enc.Utf8);
}
