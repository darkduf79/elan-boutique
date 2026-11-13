import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 jours

function authSecret(): string {
  // Lecture paresseuse : dotenv.config() est exécuté après l'évaluation des modules.
  return process.env.AUTH_SECRET || 'elan-dev-secret-change-me';
}

/** Hache un mot de passe avec scrypt. Format : scrypt$<salt hex>$<hash hex>. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

/** Vérifie un mot de passe moderne (scrypt) ou historique (texte brut). */
export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;

  if (!stored.startsWith('scrypt$')) {
    return password === stored;
  }

  const [, salt, expected] = stored.split('$');
  if (!salt || !expected) return false;

  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (actual.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actual, expectedBuffer);
}

export function isLegacyPassword(stored: string): boolean {
  return Boolean(stored) && !stored.startsWith('scrypt$');
}

/** Émet un token signé HMAC : elan.<payload base64url>.<signature base64url>. */
export function issueToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, exp: Date.now() + TOKEN_TTL_MS }),
  ).toString('base64url');
  const signature = createHmac('sha256', authSecret()).update(payload).digest('base64url');
  return `elan.${payload}.${signature}`;
}

/** Vérifie la signature et l'expiration ; retourne l'userId ou null. */
export function verifyToken(token: string): string | null {
  if (!token.startsWith('elan.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [, payload, signature] = parts;
  const expected = createHmac('sha256', authSecret()).update(payload).digest('base64url');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: string;
      exp?: number;
    };
    if (!data.sub || !data.exp || data.exp < Date.now()) return null;
    return data.sub;
  } catch {
    return null;
  }
}

/** Convertit un texte libre en slug URL. */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
