import { AES, enc } from 'crypto-js';

export function encryptString(strings: string, key: string): string {
  return AES.encrypt(strings, key).toString();
}

export function decryptString(encrypted: string, key: string): string {
  return AES.decrypt(encrypted, key).toString(enc.Utf8);
}
