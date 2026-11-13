import { Router } from 'express';
import { validateCoupon } from '../controllers/coupons.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const couponsRouter = Router();

couponsRouter.post('/validate', requireAuth, validateCoupon);
