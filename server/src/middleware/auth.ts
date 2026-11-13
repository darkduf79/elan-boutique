import { NextFunction, Request, Response } from 'express';
import { getDb } from '../database/index.js';
import type { Seller } from '../types/index.js';
import { verifyToken } from '../utils/auth.js';
import { formatSellerRow } from '../utils/seller.js';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'seller';
  createdAt: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      seller?: Seller;
    }
  }
}

/** Extrait l'userId d'un token signé, sans accès base. */
export function parseUserIdFromToken(token: string): string | null {
  return verifyToken(token);
}

export async function getUserFromRequest(req: Request): Promise<AuthUser | undefined> {
  const header = req.headers.authorization;
  if (!header) return undefined;
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  const userId = parseUserIdFromToken(token);
  if (!userId) return undefined;

  const db = await getDb();
  const row = db.queryOne<any>(
    'SELECT id, name, email, role, createdAt FROM users WHERE id = ?',
    [userId],
  );
  return row as AuthUser | undefined;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'Authentification requise. Connectez-vous pour continuer.' });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Erreur requireAuth:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification de l’authentification' });
  }
}

export async function requireCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'Authentification requise. Connectez-vous pour continuer.' });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Erreur requireCustomer:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification de l’authentification' });
  }
}

export async function requireSeller(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'Authentification requise. Connectez-vous avec un compte vendeur.' });
      return;
    }
    if (user.role !== 'seller') {
      res.status(403).json({ error: 'Accès réservé aux vendeurs. Votre compte est un compte client.' });
      return;
    }

    const db = await getDb();
    const sellerRow = db.queryOne('SELECT * FROM sellers WHERE userId = ?', [user.id]);
    if (!sellerRow) {
      res.status(403).json({
        error: 'Aucune boutique associée à ce compte vendeur. Recomplétez votre inscription vendeur.',
      });
      return;
    }

    const seller = formatSellerRow(sellerRow);
    if (seller.status !== 'active') {
      res.status(403).json({ error: 'Cette boutique est suspendue. Contactez le support Élan.' });
      return;
    }

    req.user = user;
    req.seller = seller;
    next();
  } catch (error) {
    console.error('Erreur requireSeller:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification du rôle vendeur' });
  }
}
