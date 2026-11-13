import { Router } from 'express';
import {
  addFavorite,
  getFavoriteIds,
  getFavorites,
  removeFavorite,
  toggleFavorite,
} from '../controllers/favorites.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const favoritesRouter = Router();

favoritesRouter.use(requireAuth);
favoritesRouter.get('/', getFavorites);
favoritesRouter.get('/ids', getFavoriteIds);
favoritesRouter.post('/', addFavorite);
favoritesRouter.post('/:productId/toggle', toggleFavorite);
favoritesRouter.post('/:productId', addFavorite);
favoritesRouter.delete('/:productId', removeFavorite);
