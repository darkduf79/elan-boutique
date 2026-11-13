import { Request, Response } from 'express';
import { getDb, type DatabaseAdapter } from '../database/index.js';
import { getUserFromRequest } from '../middleware/auth.js';
import type { Seller, User } from '../types/index.js';
import {
  hashPassword,
  isLegacyPassword,
  issueToken,
  slugify,
  verifyPassword,
} from '../utils/auth.js';
import { formatSellerRow, toSellerSummary } from '../utils/seller.js';

function safeUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt,
  };
}

function uniqueSlug(db: DatabaseAdapter, desired: string): string {
  const base = desired || `boutique-${Date.now()}`;
  let slug = base;
  let suffix = 2;
  while (db.queryOne('SELECT id FROM sellers WHERE slug = ?', [slug])) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const { name, email, password, role, shopName, tagline, description, avatarUrl, bannerUrl } =
      req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nom, e-mail et mot de passe sont obligatoires' });
      return;
    }

    const cleanRole = role ?? 'customer';
    if (cleanRole !== 'customer' && cleanRole !== 'seller') {
      res.status(400).json({ error: 'Rôle invalide. Choisissez « customer » (client) ou « seller » (vendeur).' });
      return;
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const existing = db.queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      res.status(409).json({ error: 'Un compte avec cette adresse e-mail existe déjà' });
      return;
    }

    if (cleanRole === 'seller' && shopName !== undefined && !String(shopName).trim()) {
      res.status(400).json({ error: 'Le nom de la boutique est obligatoire pour un compte vendeur.' });
      return;
    }

    const userId = `user-${Date.now()}`;
    const createdAt = Date.now();
    const sellerId = `seller-${Date.now()}`;
    const cleanShopName = String(shopName || name).trim();

    const result = db.transaction(() => {
      db.execute(
        'INSERT INTO users (id, name, email, password, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, String(name).trim(), cleanEmail, hashPassword(String(password)), cleanRole, createdAt],
      );

      if (cleanRole !== 'seller') {
        return { seller: undefined };
      }

      const slug = uniqueSlug(db, slugify(cleanShopName));
      db.execute(
        `INSERT INTO sellers (
          id, userId, shopName, slug, tagline, description, avatarUrl, bannerUrl,
          isPro, status, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'active', ?)`,
        [
          sellerId,
          userId,
          cleanShopName,
          slug,
          tagline ? String(tagline).trim() : null,
          description ? String(description).trim() : null,
          avatarUrl ? String(avatarUrl).trim() : null,
          bannerUrl ? String(bannerUrl).trim() : null,
          createdAt,
        ],
      );

      return {
        seller: db.queryOne('SELECT * FROM sellers WHERE id = ?', [sellerId]) as any,
      };
    });

    const user = safeUser(
      db.queryOne('SELECT * FROM users WHERE id = ?', [userId]),
    );
    const seller = result.seller ? formatSellerRow(result.seller) : undefined;

    res.status(201).json({
      message: 'Compte créé avec succès',
      user,
      seller: seller ? { ...seller, summary: toSellerSummary(seller) } : null,
      token: issueToken(userId),
    });
  } catch (error) {
    console.error('Erreur register:', error);
    res.status(500).json({ error: 'Erreur lors de la création du compte' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'E-mail et mot de passe sont obligatoires' });
      return;
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const row = db.queryOne<any>('SELECT * FROM users WHERE email = ?', [cleanEmail]);

    if (!row || !verifyPassword(String(password), row.password)) {
      res.status(401).json({ error: 'Adresse e-mail ou mot de passe incorrect' });
      return;
    }

    // Migration silencieuse des anciens mots de passe en clair.
    if (isLegacyPassword(row.password)) {
      db.execute('UPDATE users SET password = ? WHERE id = ?', [
        hashPassword(String(password)),
        row.id,
      ]);
    }

    const user = safeUser(row);
    const sellerRow = db.queryOne<any>('SELECT * FROM sellers WHERE userId = ?', [row.id]);
    const seller: Seller | undefined = sellerRow ? formatSellerRow(sellerRow) : undefined;

    res.json({
      message: 'Connexion réussie',
      user,
      seller: seller ? { ...seller, summary: toSellerSummary(seller) } : null,
      token: issueToken(row.id),
    });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    const db = await getDb();
    const sellerRow = db.queryOne<any>('SELECT * FROM sellers WHERE userId = ?', [user.id]);
    const seller: Seller | undefined = sellerRow ? formatSellerRow(sellerRow) : undefined;

    res.json({
      user,
      seller: seller ? { ...seller, summary: toSellerSummary(seller) } : null,
    });
  } catch (error) {
    console.error('Erreur getMe:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
  }
}
