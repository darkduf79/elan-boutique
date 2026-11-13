import { Router } from 'express';
import { getSellerById, getSellerProducts, getSellers } from '../controllers/sellers.controller.js';

export const sellersRouter = Router();

sellersRouter.get('/', getSellers);
sellersRouter.get('/:id', getSellerById);
sellersRouter.get('/:id/products', getSellerProducts);
