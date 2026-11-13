import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { uploadsDir } from './controllers/uploads.controller.js';
import { addressesRouter } from './routes/addresses.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { couponsRouter } from './routes/coupons.routes.js';
import { favoritesRouter } from './routes/favorites.routes.js';
import { ordersRouter } from './routes/orders.routes.js';
import { paymentsRouter } from './routes/payments.routes.js';
import { productsRouter } from './routes/products.routes.js';
import { reviewsRouter } from './routes/reviews.routes.js';
import { sellerRouter } from './routes/seller.routes.js';
import { sellersRouter } from './routes/sellers.routes.js';
import { uploadsRouter } from './routes/uploads.routes.js';
import factureRoutes from './routes/factures.js';

export const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Images produits téléversées par les vendeurs.
app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }));

// Detailed Request & Response Logging Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const timestamp = new Date().toLocaleTimeString('fr-FR');
  const method = req.method;
  const url = req.originalUrl || req.url;
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  console.log(`\n📡 [${timestamp}] --> ${method} ${url} (ip: ${clientIp})`);

  if (['POST', 'PUT', 'PATCH'].includes(method) && req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '***';
    console.log(`   📦 Payload:`, JSON.stringify(sanitizedBody));
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const icon = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✅';
    console.log(`${icon} [${timestamp}] <-- ${method} ${url} [${status}] (${duration}ms)`);
  });

  next();
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Élan E-Commerce API',
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/auth', authRouter);
app.use('/api/sellers', sellersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/addresses', addressesRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/seller', sellerRouter);

// ✅ AJOUT DE LA ROUTE DE FACTURATION ICI
app.use(factureRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.originalUrl,
    method: req.method,
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur interne du serveur',
  });
});