import bcrypt from 'bcryptjs';

const COST_FACTOR = 12;

/** Pre-computed hash used to keep login timing uniform when the email is unknown. */
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', COST_FACTOR);

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST_FACTOR);
}

export function verifyPassword(plain: string, hash: string | null): Promise<boolean> {
  return bcrypt.compare(plain, hash ?? DUMMY_HASH).then((matches) => matches && hash !== null);
}
