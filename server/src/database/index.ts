import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from '../utils/auth.js';
import {
  resolveSeedSellerId,
  seedProducts,
  seedReviews,
  seedSellers,
  seedUsers,
} from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbDir = path.resolve(__dirname, '../../data');
const dbPath = path.join(dbDir, 'elan.sqlite');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export interface DatabaseAdapter {
  exec: (sql: string) => void;
  queryAll: <T = any>(sql: string, params?: any[]) => T[];
  queryOne: <T = any>(sql: string, params?: any[]) => T | undefined;
  execute: (sql: string, params?: any[]) => { changes: number; lastInsertRowid?: number | bigint };
  transaction: <T>(fn: () => T) => T;
}

// Le corps de fn doit être synchrone : Node étant mono-thread, aucune autre
// requête ne peut s'intercaler entre BEGIN et COMMIT.
function runTransaction<T>(exec: (sql: string) => void, fn: () => T): T {
  exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    exec('COMMIT');
    return result;
  } catch (err) {
    exec('ROLLBACK');
    throw err;
  }
}

let dbInstance: DatabaseAdapter;

/**
 * SQLite n'accepte que number/string/bigint/buffer/null : on convertit les
 * valeurs `undefined` (champs absents du payload) en `null` pour éviter des
 * erreurs de binding au moment de l'insertion.
 */
function normalizeParams(params: any[] = []): any[] {
  return params.map((value) => (value === undefined ? null : value));
}


async function createDatabase(): Promise<DatabaseAdapter> {
  // Try better-sqlite3 first
  try {
    const BetterSqlite3 = (await import('better-sqlite3')).default;
    const db = new BetterSqlite3(dbPath);
    db.pragma('journal_mode = WAL');

    return {
      exec: (sql: string) => db.exec(sql),
      queryAll: <T = any>(sql: string, params: any[] = []): T[] => {
        return db.prepare(sql).all(...normalizeParams(params)) as T[];
      },
      queryOne: <T = any>(sql: string, params: any[] = []): T | undefined => {
        return db.prepare(sql).get(...normalizeParams(params)) as T | undefined;
      },
      execute: (sql: string, params: any[] = []) => {
        const result = db.prepare(sql).run(...normalizeParams(params));
        return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
      },
      transaction: <T>(fn: () => T): T => runTransaction((sql) => db.exec(sql), fn),
    };
  } catch (err) {
    // Fallback to Node 22 built-in node:sqlite
    try {
      const { DatabaseSync } = await import('node:sqlite');
      const db = new DatabaseSync(dbPath);
      db.exec('PRAGMA journal_mode = WAL;');

      return {
        exec: (sql: string) => db.exec(sql),
        queryAll: <T = any>(sql: string, params: any[] = []): T[] => {
          return db.prepare(sql).all(...normalizeParams(params)) as T[];
        },
        queryOne: <T = any>(sql: string, params: any[] = []): T | undefined => {
          return db.prepare(sql).get(...normalizeParams(params)) as T | undefined;
        },
        execute: (sql: string, params: any[] = []) => {
          const result = db.prepare(sql).run(...normalizeParams(params));
          return { changes: Number(result.changes), lastInsertRowid: result.lastInsertRowid };
        },
        transaction: <T>(fn: () => T): T => runTransaction((sql) => db.exec(sql), fn),
      };
    } catch (fallbackErr) {
      console.error('Erreur lors de l’initialisation de SQLite:', err, fallbackErr);
      throw fallbackErr;
    }
  }
}

export async function getDb(): Promise<DatabaseAdapter> {
  if (!dbInstance) {
    dbInstance = await createDatabase();
    await initSchema(dbInstance);
  }
  return dbInstance;
}

function tableExists(db: DatabaseAdapter, name: string): boolean {
  return Boolean(
    db.queryOne<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      [name],
    ),
  );
}

function tableColumns(db: DatabaseAdapter, table: string): string[] {
  return db
    .queryAll<{ name: string }>(`PRAGMA table_info(${table})`)
    .map((column) => column.name);
}

function addColumnIfMissing(
  db: DatabaseAdapter,
  table: string,
  column: string,
  definition: string,
): void {
  if (!tableColumns(db, table).includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function uniqueSlug(db: DatabaseAdapter, desired: string, sellerId: string): string {
  const base = desired || `boutique-${sellerId}`;
  let slug = base;
  let suffix = 2;
  while (
    db.queryOne<{ id: string }>('SELECT id FROM sellers WHERE slug = ? AND id <> ?', [
      slug,
      sellerId,
    ])
  ) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

/**
 * L'ancienne table seller_profile (colonne « name » obligatoire, KPI fixes) est
 * reconstruite au schéma moderne. Sans cela, les nouvelles boutiques ne peuvent
 * pas être insérées car la colonne héritée `name` est NOT NULL sans valeur par défaut.
 */
function rebuildLegacySellersTable(db: DatabaseAdapter, columns: string[]): void {
  const has = (name: string) => columns.includes(name);
  const now = Date.now();

  const shopNameExpr = has('shopName')
    ? "COALESCE(NULLIF(shopName, ''), NULLIF(name, ''), 'Boutique Élan')"
    : "COALESCE(NULLIF(name, ''), 'Boutique Élan')";

  db.exec('ALTER TABLE sellers RENAME TO sellers_legacy');
  db.exec(`
    CREATE TABLE sellers (
      id TEXT PRIMARY KEY,
      userId TEXT,
      shopName TEXT NOT NULL,
      slug TEXT,
      tagline TEXT,
      description TEXT,
      avatarUrl TEXT,
      bannerUrl TEXT,
      isPro INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      createdAt INTEGER NOT NULL
    );
  `);
  db.exec(`
    INSERT INTO sellers (
      id, userId, shopName, slug, tagline, description, avatarUrl, bannerUrl,
      isPro, status, createdAt
    )
    SELECT
      id,
      ${has('userId') ? 'userId' : 'NULL'},
      ${shopNameExpr},
      ${has('slug') ? 'slug' : 'NULL'},
      ${has('tagline') ? 'tagline' : 'NULL'},
      ${has('description') ? 'description' : 'NULL'},
      ${has('avatarUrl') ? 'avatarUrl' : 'NULL'},
      ${has('bannerUrl') ? 'bannerUrl' : 'NULL'},
      ${has('isPro') ? 'COALESCE(isPro, 0)' : '0'},
      ${has('status') ? "COALESCE(NULLIF(status, ''), 'active')" : "'active'"},
      ${has('createdAt') ? `COALESCE(createdAt, ${now})` : String(now)}
    FROM sellers_legacy;
  `);
  db.exec('DROP TABLE sellers_legacy');
}


async function initSchema(db: DatabaseAdapter) {
  // Backup ponctuel avant la migration multi-vendeurs.
  const backupPath = `${dbPath}.bak-multiseller`;
  if (!fs.existsSync(backupPath) && fs.existsSync(dbPath)) {
    try {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`🗂️  Sauvegarde de la base avant migration : ${backupPath}`);
    } catch (error) {
      console.warn('⚠️  Impossible de créer la sauvegarde de la base :', error);
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Tables de base
  // ---------------------------------------------------------------------------
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      createdAt INTEGER NOT NULL
    );
  `);

  // Migration : l'ancienne table seller_profile devient sellers.
  if (tableExists(db, 'seller_profile') && !tableExists(db, 'sellers')) {
    db.exec('ALTER TABLE seller_profile RENAME TO sellers');
  }

  // Migration : reconstruit le schéma historique (colonne name obligatoire).
  if (tableExists(db, 'sellers') && tableColumns(db, 'sellers').includes('name')) {
    rebuildLegacySellersTable(db, tableColumns(db, 'sellers'));
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS sellers (
      id TEXT PRIMARY KEY,
      userId TEXT,
      shopName TEXT NOT NULL,
      slug TEXT,
      tagline TEXT,
      description TEXT,
      avatarUrl TEXT,
      bannerUrl TEXT,
      isPro INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sellerId TEXT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT,
      headerLabel TEXT,
      universe TEXT,
      brand TEXT,
      ref TEXT,
      price REAL NOT NULL,
      oldPrice REAL,
      stock INTEGER NOT NULL DEFAULT 0,
      rating REAL NOT NULL DEFAULT 0,
      reviewCount INTEGER NOT NULL DEFAULT 0,
      recommend INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      images TEXT,
      finishes TEXT,
      features TEXT,
      description TEXT,
      isOnline INTEGER NOT NULL DEFAULT 1,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      productId TEXT NOT NULL,
      userId TEXT,
      sellerId TEXT,
      userName TEXT NOT NULL,
      rating INTEGER NOT NULL,
      title TEXT,
      comment TEXT NOT NULL,
      tags TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      sellerReply TEXT,
      sellerReplyAt INTEGER,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      userId TEXT,
      items TEXT NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      shippingAddress TEXT,
      deliveryMode TEXT,
      shippingCost REAL NOT NULL DEFAULT 0,
      discountTotal REAL NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_sellers (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      sellerId TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      shippingShare REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      orderSellerId TEXT NOT NULL,
      productId TEXT NOT NULL,
      sellerId TEXT NOT NULL,
      title TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unitPrice REAL NOT NULL,
      lineTotal REAL NOT NULL
    );

    -- Factures : aucune contrainte de clé étrangère, comme dans le flux de facturation.
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      orderId TEXT,
      orderSellerId TEXT,
      sellerId TEXT NOT NULL,
      clientId TEXT NOT NULL,
      productId TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'paid',
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS favorites (
      userId TEXT NOT NULL,
      productId TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      PRIMARY KEY (userId, productId)
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      label TEXT,
      fullName TEXT NOT NULL,
      phone TEXT,
      line1 TEXT NOT NULL,
      line2 TEXT,
      city TEXT NOT NULL,
      postalCode TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'France',
      isDefault INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      sellerId TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL DEFAULT 'percent',
      value REAL NOT NULL,
      minSubtotal REAL NOT NULL DEFAULT 0,
      maxUses INTEGER NOT NULL DEFAULT 0,
      usedCount INTEGER NOT NULL DEFAULT 0,
      startsAt INTEGER,
      endsAt INTEGER,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coupon_redemptions (
      id TEXT PRIMARY KEY,
      couponId TEXT NOT NULL,
      orderId TEXT NOT NULL,
      userId TEXT,
      amount REAL NOT NULL,
      createdAt INTEGER NOT NULL
    );
  `);

  // ---------------------------------------------------------------------------
  // 2. Colonnes ajoutées aux anciennes bases
  // ---------------------------------------------------------------------------
  const sellerColumns = tableColumns(db, 'sellers');
  const sellerAlterations: [string, string][] = [
    ['userId', 'TEXT'],
    ['shopName', 'TEXT'],
    ['slug', 'TEXT'],
    ['tagline', 'TEXT'],
    ['description', 'TEXT'],
    ['avatarUrl', 'TEXT'],
    ['bannerUrl', 'TEXT'],
    ['isPro', 'INTEGER NOT NULL DEFAULT 0'],
    ['status', "TEXT NOT NULL DEFAULT 'active'"],
    ['createdAt', 'INTEGER'],
  ];
  for (const [column, definition] of sellerAlterations) {
    if (!sellerColumns.includes(column)) {
      db.exec(`ALTER TABLE sellers ADD COLUMN ${column} ${definition}`);
    }
  }
  if (tableColumns(db, 'sellers').includes('name')) {
    db.exec('UPDATE sellers SET shopName = COALESCE(shopName, name)');
  }
  db.exec(`
    UPDATE sellers SET shopName = COALESCE(shopName, 'Boutique Élan') WHERE shopName IS NULL;
    UPDATE sellers SET status = COALESCE(status, 'active');
    UPDATE sellers SET createdAt = COALESCE(createdAt, ${Date.now()});
  `);

  addColumnIfMissing(db, 'products', 'sellerId', 'TEXT');
  addColumnIfMissing(db, 'orders', 'deliveryMode', 'TEXT');
  addColumnIfMissing(db, 'orders', 'shippingCost', 'REAL NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'orders', 'discountTotal', 'REAL NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'reviews', 'userId', 'TEXT');
  addColumnIfMissing(db, 'reviews', 'sellerId', 'TEXT');
  addColumnIfMissing(db, 'reviews', 'sellerReply', 'TEXT');
  addColumnIfMissing(db, 'reviews', 'sellerReplyAt', 'INTEGER');
  addColumnIfMissing(db, 'invoices', 'orderId', 'TEXT');
  addColumnIfMissing(db, 'invoices', 'orderSellerId', 'TEXT');

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_sellerId ON products(sellerId);
    CREATE INDEX IF NOT EXISTS idx_order_sellers_orderId ON order_sellers(orderId);
    CREATE INDEX IF NOT EXISTS idx_order_sellers_sellerId ON order_sellers(sellerId);
    CREATE INDEX IF NOT EXISTS idx_order_items_orderId ON order_items(orderId);
    CREATE INDEX IF NOT EXISTS idx_order_items_orderSellerId ON order_items(orderSellerId);
    CREATE INDEX IF NOT EXISTS idx_invoices_orderId ON invoices(orderId);
    CREATE INDEX IF NOT EXISTS idx_invoices_orderSellerId ON invoices(orderSellerId);
    CREATE INDEX IF NOT EXISTS idx_favorites_userId ON favorites(userId);
    CREATE INDEX IF NOT EXISTS idx_addresses_userId ON addresses(userId);
    CREATE INDEX IF NOT EXISTS idx_coupons_sellerId ON coupons(sellerId);
  `);

  // Migration : normalise l'ancien statut « completed » vers « delivered ».
  db.exec("UPDATE orders SET status = 'delivered' WHERE status = 'completed'");
  db.exec("UPDATE order_sellers SET status = 'delivered' WHERE status = 'completed'");

  // ---------------------------------------------------------------------------
  // 3. Seed initial (uniquement sur une base vide de produits)
  // ---------------------------------------------------------------------------
  const productCount = db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM products');
  const shouldSeed = (productCount?.count ?? 0) === 0;

  // Les boutiques et comptes vendeurs de démonstration sont toujours garantis,
  // même sur une base existante, pour pouvoir tester le multi-vendeurs.
  seedSellersAndUsers(db);

  // Remplit les userId/slug manquants sur d'anciennes boutiques.
  backfillSellers(db);

  if (shouldSeed) {
    console.log('🌱 Peuple la base de données avec les données initiales multi-vendeurs...');

    for (const p of seedProducts) {
      db.execute(
        `INSERT INTO products (
          id, sellerId, title, category, subcategory, headerLabel, universe, brand, ref,
          price, oldPrice, stock, rating, reviewCount, recommend, image, images,
          finishes, features, description, isOnline, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.id,
          p.sellerId ?? resolveSeedSellerId(p.category),
          p.title,
          p.category,
          p.subcategory ?? null,
          p.headerLabel ?? null,
          p.universe ?? p.category,
          p.brand ?? 'ÉLAN',
          p.ref ?? null,
          p.price,
          p.oldPrice ?? null,
          p.stock,
          p.rating,
          p.reviewCount,
          p.recommend,
          p.image ?? null,
          p.images ? JSON.stringify(p.images) : null,
          p.finishes ? JSON.stringify(p.finishes) : null,
          p.features ? JSON.stringify(p.features) : null,
          p.description ?? null,
          p.isOnline ? 1 : 0,
          p.createdAt,
        ],
      );
    }

    for (const r of seedReviews) {
      const product = db.queryOne<{ sellerId: string }>(
        'SELECT sellerId FROM products WHERE id = ?',
        [r.productId],
      );
      db.execute(
        `INSERT INTO reviews (
          id, productId, userId, sellerId, userName, rating, title, comment, tags, verified, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          r.id,
          r.productId,
          r.userId ?? null,
          product?.sellerId ?? null,
          r.userName,
          r.rating,
          r.title ?? null,
          r.comment,
          r.tags ? JSON.stringify(r.tags) : null,
          r.verified ? 1 : 0,
          r.createdAt,
        ],
      );
    }

    insertDemoAddress(db);
    insertDemoCoupons(db);

    console.log('✅ Base de données SQLite prête et peuplée avec succès !');
  }

  // Garantit les données de démonstration sur une base déjà existante.
  insertDemoAddress(db);
  insertDemoCoupons(db);

  // Attribue les produits orphelins à la boutique correspondant à leur univers.
  const defaultSeller = db.queryOne<{ id: string }>('SELECT id FROM sellers ORDER BY createdAt ASC LIMIT 1');
  if (defaultSeller) {
    const knownSellers = new Set(
      db.queryAll<{ id: string }>('SELECT id FROM sellers').map((row) => row.id),
    );
    const orphanProducts = db.queryAll<{ id: string; category: string }>(
      'SELECT id, category FROM products WHERE sellerId IS NULL',
    );
    for (const product of orphanProducts) {
      const resolved = resolveSeedSellerId(product.category);
      const target = knownSellers.has(resolved) ? resolved : defaultSeller.id;
      db.execute('UPDATE products SET sellerId = ? WHERE id = ?', [target, product.id]);
    }
    db.execute('UPDATE reviews SET sellerId = (SELECT sellerId FROM products WHERE products.id = reviews.productId) WHERE sellerId IS NULL');
  }

  backfillOrderGroups(db);
  backfillInvoices(db);
  db.exec('PRAGMA user_version = 2');
}

function seedSellersAndUsers(db: DatabaseAdapter): void {
  for (const seller of seedSellers) {
    db.execute(
      `INSERT OR IGNORE INTO sellers (
        id, userId, shopName, slug, tagline, description, avatarUrl, bannerUrl,
        isPro, status, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        seller.id,
        seller.userId,
        seller.shopName,
        seller.slug,
        seller.tagline ?? null,
        seller.description ?? null,
        seller.avatarUrl ?? null,
        seller.bannerUrl ?? null,
        seller.isPro ? 1 : 0,
        seller.status,
        seller.createdAt,
      ],
    );
  }

  for (const user of seedUsers) {
    db.execute(
      `INSERT OR IGNORE INTO users (id, name, email, password, role, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.name,
        user.email,
        hashPassword(user.password ?? 'password123'),
        user.role,
        user.createdAt,
      ],
    );
  }
}

function backfillSellers(db: DatabaseAdapter): void {
  const sellers = db.queryAll<any>('SELECT * FROM sellers');
  const usedUserIds = new Set<string>();

  for (const seller of sellers) {
    const seed = seedSellers.find((item) => item.id === seller.id);
    let userId: string | undefined = seller.userId;

    // Les boutiques de démonstration ont un compte vendeur canonique.
    if (
      seed?.userId &&
      !usedUserIds.has(seed.userId) &&
      db.queryOne('SELECT id FROM users WHERE id = ?', [seed.userId])
    ) {
      userId = seed.userId;
    }

    if (userId && usedUserIds.has(userId)) {
      userId = undefined;
    }

    if (!userId || !db.queryOne('SELECT id FROM users WHERE id = ?', [userId])) {
      const reserved = new Set(seedSellers.map((item) => item.userId));
      const candidate = db
        .queryAll<{ id: string }>("SELECT id FROM users WHERE role = 'seller'")
        .find((user) => !usedUserIds.has(user.id) && !reserved.has(user.id));
      userId = candidate?.id;
    }

    if (!userId) {
      userId = `user-${seller.id}`;
      const email = `${seller.slug || seller.id}@elan.local`;
      db.execute(
        `INSERT OR IGNORE INTO users (id, name, email, password, role, createdAt)
         VALUES (?, ?, ?, ?, 'seller', ?)`,
        [userId, seller.shopName, email, hashPassword('password123'), Date.now()],
      );
    }

    const slug = uniqueSlug(
      db,
      seller.slug || slugifySafe(seller.shopName || seller.id),
      seller.id,
    );
    db.execute('UPDATE sellers SET userId = ?, slug = ?, shopName = ? WHERE id = ?', [
      userId,
      slug,
      seller.shopName,
      seller.id,
    ]);
    usedUserIds.add(userId);
  }
}

function slugifySafe(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function insertDemoAddress(db: DatabaseAdapter): void {
  const existing = db.queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM addresses WHERE userId = ?',
    ['user-demo-1'],
  );
  if ((existing?.count ?? 0) > 0) return;

  db.execute(
    `INSERT INTO addresses (
      id, userId, label, fullName, phone, line1, line2, city, postalCode, country, isDefault, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'addr-demo-1',
      'user-demo-1',
      'Maison',
      'Thomas Lefebvre',
      '+33 6 12 34 56 78',
      '12 rue des Lilas',
      '',
      'Paris',
      '75011',
      'France',
      1,
      Date.now(),
    ],
  );
}

function insertDemoCoupons(db: DatabaseAdapter): void {
  const existing = db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM coupons');
  if ((existing?.count ?? 0) > 0) return;

  const coupons = [
    ['coupon-elan-10', 'seller-elan', 'ELAN10', 'percent', 10, 50, 100],
    ['coupon-sound-15', 'seller-sound', 'SOUND15', 'percent', 15, 80, 50],
    ['coupon-maison-5', 'seller-maison', 'MAISON5', 'fixed', 5, 30, 100],
    ['coupon-marche-10', 'seller-marche', 'MARCHE10', 'percent', 10, 20, 100],
  ] as const;

  for (const [id, sellerId, code, type, value, minSubtotal, maxUses] of coupons) {
    db.execute(
      `INSERT OR IGNORE INTO coupons (
        id, sellerId, code, type, value, minSubtotal, maxUses, usedCount, isActive, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?)`,
      [id, sellerId, code, type, value, minSubtotal, maxUses, Date.now()],
    );
  }
}

function parseItems(raw: unknown): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function backfillOrderGroups(db: DatabaseAdapter): void {
  const orders = db.queryAll<any>('SELECT * FROM orders');
  const defaultSeller = db.queryOne<{ id: string }>(
    'SELECT id FROM sellers ORDER BY createdAt ASC LIMIT 1',
  );
  if (!defaultSeller) return;

  for (const order of orders) {
    const existing = db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM order_sellers WHERE orderId = ?',
      [order.id],
    );
    if ((existing?.count ?? 0) > 0) continue;

    const items = parseItems(order.items);
    if (items.length === 0) continue;

    const groups = new Map<string, any[]>();
    for (const item of items) {
      const product = item?.productId
        ? db.queryOne<{ sellerId: string }>('SELECT sellerId FROM products WHERE id = ?', [
            item.productId,
          ])
        : undefined;
      const sellerId = product?.sellerId || defaultSeller.id;
      if (!groups.has(sellerId)) groups.set(sellerId, []);
      groups.get(sellerId)!.push(item);
    }

    let index = 0;
    for (const [sellerId, sellerItems] of groups) {
      const subtotal = sellerItems.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
        0,
      );
      const shippingShare = index === 0 ? Number(order.shippingCost || 0) : 0;
      const orderSellerId = `os-${order.id.replace(/^cmd-/, '')}-${index + 1}`;
      const status = order.status === 'completed' ? 'delivered' : order.status;

      db.execute(
        `INSERT INTO order_sellers (
          id, orderId, sellerId, subtotal, discount, shippingShare, total, status, createdAt
        ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)`,
        [
          orderSellerId,
          order.id,
          sellerId,
          Math.round(subtotal * 100) / 100,
          shippingShare,
          Math.round((subtotal + shippingShare) * 100) / 100,
          status,
          order.createdAt,
        ],
      );

      let itemIndex = 0;
      for (const item of sellerItems) {
        const unitPrice = Number(item.price || 0);
        const quantity = Number(item.quantity || 0);
        db.execute(
          `INSERT INTO order_items (
            id, orderId, orderSellerId, productId, sellerId, title, quantity, unitPrice, lineTotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `oi-${order.id.replace(/^cmd-/, '')}-${index + 1}-${itemIndex + 1}`,
            order.id,
            orderSellerId,
            String(item.productId || ''),
            sellerId,
            String(item.title || 'Article'),
            quantity,
            unitPrice,
            Math.round(unitPrice * quantity * 100) / 100,
          ],
        );
        itemIndex += 1;
      }
      index += 1;
    }
  }
}

function backfillInvoices(db: DatabaseAdapter): void {
  const invoices = db.queryAll<any>('SELECT * FROM invoices');
  const defaultSeller = db.queryOne<{ id: string }>(
    'SELECT id FROM sellers ORDER BY createdAt ASC LIMIT 1',
  );

  for (const invoice of invoices) {
    let orderSeller = invoice.orderSellerId
      ? db.queryOne<any>('SELECT * FROM order_sellers WHERE id = ?', [invoice.orderSellerId])
      : undefined;

    if (!orderSeller && invoice.orderId) {
      orderSeller =
        db.queryOne<any>(
          'SELECT * FROM order_sellers WHERE orderId = ? AND sellerId = ? LIMIT 1',
          [invoice.orderId, invoice.sellerId],
        ) ??
        db.queryOne<any>('SELECT * FROM order_sellers WHERE orderId = ? ORDER BY createdAt ASC LIMIT 1', [
          invoice.orderId,
        ]);
    }

    const sellerId = orderSeller?.sellerId || invoice.sellerId || defaultSeller?.id;
    if (!sellerId) continue;

    db.execute('UPDATE invoices SET orderSellerId = ?, sellerId = ? WHERE id = ?', [
      orderSeller?.id ?? null,
      sellerId,
      invoice.id,
    ]);
  }
}
