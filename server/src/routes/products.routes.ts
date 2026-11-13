import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  updateProduct,
} from '../controllers/products.controller.js';
import { requireSeller } from '../middleware/auth.js';

export const productsRouter = Router();

productsRouter.get('/', getProducts);
productsRouter.get('/:id', getProductById);
productsRouter.post('/', requireSeller, createProduct);
productsRouter.patch('/:id', requireSeller, updateProduct);
productsRouter.put('/:id', requireSeller, updateProduct);
productsRouter.delete('/:id', requireSeller, deleteProduct);