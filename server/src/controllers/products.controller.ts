import { Request, Response } from 'express';
import { getDb } from '../database/index.js';
import type { Product } from '../types/index.js';
import { formatProductRow, PRODUCT_SELECT } from '../utils/products.js';

function formatReviewRow(row: any) {
  return {
    ...row,
    verified: Boolean(row.verified),
    tags: row.tags ? JSON.parse(row.tags) : [],
  };
}

export async function getProducts(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const {
      q,
      category,
      universe,
      minPrice,
      maxPrice,
      minRating,
      inStock,
      sort,
      sellerView,
      sellerId,
      sellerSlug,
    } = req.query;

    let query = `${PRODUCT_SELECT} WHERE 1=1`;
    const params: any[] = [];

    if (sellerView !== 'true') {
      query += ' AND p.isOnline = 1';
    }

    if (q && typeof q === 'string') {
      const searchTerm = `%${q.trim()}%`;
      query +=
        ' AND (p.title LIKE ? OR p.brand LIKE ? OR p.description LIKE ? OR p.category LIKE ? OR s.shopName LIKE ?)';
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (category && typeof category === 'string' && category !== 'Tout') {
      query += ' AND p.category = ?';
      params.push(category);
    }

    if (universe && typeof universe === 'string') {
      query += ' AND p.universe = ?';
      params.push(universe);
    }

    if (sellerId && typeof sellerId === 'string') {
      query += ' AND p.sellerId = ?';
      params.push(sellerId);
    }

    if (sellerSlug && typeof sellerSlug === 'string') {
      query += ' AND s.slug = ?';
      params.push(sellerSlug);
    }

    if (minPrice) {
      query += ' AND p.price >= ?';
      params.push(Number(minPrice));
    }

    if (maxPrice) {
      query += ' AND p.price <= ?';
      params.push(Number(maxPrice));
    }

    if (minRating) {
      query += ' AND p.rating >= ?';
      params.push(Number(minRating));
    }

    if (inStock === 'true') {
      query += ' AND p.stock > 0';
    }

    switch (sort) {
      case 'prix-asc':
        query += ' ORDER BY p.price ASC';
        break;
      case 'prix-desc':
        query += ' ORDER BY p.price DESC';
        break;
      case 'nouveautes':
        query += ' ORDER BY p.createdAt DESC';
        break;
      case 'notes':
        query += ' ORDER BY p.rating DESC, p.reviewCount DESC';
        break;
      default:
        query += ' ORDER BY p.createdAt DESC';
        break;
    }

    const rows = db.queryAll(query, params);
    res.json(rows.map(formatProductRow));
  } catch (error) {
    console.error('Erreur getProducts:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des produits' });
  }
}

export async function getProductById(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const { id } = req.params;

    const row = db.queryOne(`${PRODUCT_SELECT} WHERE p.id = ?`, [id]);
    if (!row) {
      res.status(404).json({ error: 'Produit introuvable' });
      return;
    }

    const reviews = db.queryAll(
      'SELECT * FROM reviews WHERE productId = ? ORDER BY createdAt DESC',
      [id],
    );

    const product: Product = {
      ...formatProductRow(row),
      reviews: reviews.map(formatReviewRow),
    };

    res.json(product);
  } catch (error) {
    console.error('Erreur getProductById:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du produit' });
  }
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const sellerId = req.seller!.id;
    const {
      title,
      category,
      subcategory,
      headerLabel,
      universe,
      brand,
      ref,
      price,
      oldPrice,
      stock,
      image,
      images,
      finishes,
      features,
      description,
      isOnline,
    } = req.body;

    if (!title || price === undefined || !category) {
      res.status(400).json({ error: 'Titre, prix et catégorie sont obligatoires' });
      return;
    }

    if (!Number.isFinite(Number(price)) || Number(price) < 0) {
      res.status(400).json({ error: 'Prix invalide' });
      return;
    }

    const id = `prod-${Date.now()}`;
    const createdAt = Date.now();
    const imageUrl = image ?? (Array.isArray(images) ? images[0] : undefined) ?? null;
    const stockValue = stock === undefined || stock === null || stock === '' ? 10 : Number(stock);

    db.execute(
      `INSERT INTO products (
        id, sellerId, title, category, subcategory, headerLabel, universe, brand, ref,
        price, oldPrice, stock, rating, reviewCount, recommend, image, images,
        finishes, features, description, isOnline, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        sellerId,
        title,
        category,
        subcategory ?? null,
        headerLabel ?? String(title).toUpperCase(),
        universe ?? category,
        brand ?? 'ÉLAN',
        ref ?? `ELN-${Math.floor(1000 + Math.random() * 9000)}`,
        Number(price),
        oldPrice ? Number(oldPrice) : null,
        Number.isFinite(stockValue) ? stockValue : 10,
        0,
        0,
        0,
        imageUrl,
        images ? JSON.stringify(images) : null,
        finishes ? JSON.stringify(finishes) : null,
        features ? JSON.stringify(features) : null,
        description ?? '',
        isOnline === false ? 0 : 1,
        createdAt,
      ],
    );

    const created = db.queryOne(`${PRODUCT_SELECT} WHERE p.id = ?`, [id]);
    res.status(201).json(formatProductRow(created));
  } catch (error) {
    console.error('Erreur createProduct:', error);
    res.status(500).json({ error: 'Erreur lors de la création du produit' });
  }
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const { id } = req.params;
    const existing = db.queryOne<any>('SELECT * FROM products WHERE id = ?', [id]);

    if (!existing) {
      res.status(404).json({ error: 'Produit introuvable' });
      return;
    }

    if (existing.sellerId !== req.seller!.id) {
      res.status(403).json({ error: 'Ce produit appartient à une autre boutique.' });
      return;
    }

    const updates: string[] = [];
    const params: any[] = [];

    const allowedFields = [
      'title',
      'category',
      'subcategory',
      'headerLabel',
      'universe',
      'brand',
      'ref',
      'price',
      'oldPrice',
      'stock',
      'isOnline',
      'description',
      'image',
      'images',
      'finishes',
      'features',
    ];

    for (const field of allowedFields) {
      if (req.body[field] === undefined) continue;

      updates.push(`${field} = ?`);
      if (field === 'isOnline') {
        params.push(req.body[field] ? 1 : 0);
      } else if (['images', 'finishes', 'features'].includes(field)) {
        params.push(JSON.stringify(req.body[field] ?? []));
      } else if (field === 'oldPrice') {
        params.push(req.body[field] === null || req.body[field] === '' ? null : Number(req.body[field]));
      } else if (field === 'price' || field === 'stock') {
        params.push(Number(req.body[field]));
      } else {
        params.push(req.body[field]);
      }
    }

    if (updates.length > 0) {
      params.push(id);
      db.execute(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const updated = db.queryOne(`${PRODUCT_SELECT} WHERE p.id = ?`, [id]);
    res.json(formatProductRow(updated));
  } catch (error) {
    console.error('Erreur updateProduct:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du produit' });
  }
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const { id } = req.params;

    const existing = db.queryOne<any>('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Produit introuvable' });
      return;
    }

    if (existing.sellerId !== req.seller!.id) {
      res.status(403).json({ error: 'Ce produit appartient à une autre boutique.' });
      return;
    }

    db.execute('DELETE FROM products WHERE id = ?', [id]);
    res.json({ message: 'Produit supprimé avec succès', id });
  } catch (error) {
    console.error('Erreur deleteProduct:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du produit' });
  }
}
