import bcrypt from 'bcrypt';

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, bcrypt.genSaltSync(10));
}

export function verifyPassword(
  password: string,
  encrypted: string,
): Promise<boolean> {
  return bcrypt.compare(password, encrypted);
}
