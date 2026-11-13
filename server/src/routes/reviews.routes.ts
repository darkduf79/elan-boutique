import { Router } from 'express';
import { createReview, deleteReview, getReviews } from '../controllers/reviews.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const reviewsRouter = Router();

reviewsRouter.get('/', getReviews);
reviewsRouter.get('/product/:productId', getReviews);
reviewsRouter.post('/', requireAuth, createReview);
reviewsRouter.post('/product/:productId', requireAuth, createReview);
reviewsRouter.delete('/:id', requireAuth, deleteReview);
