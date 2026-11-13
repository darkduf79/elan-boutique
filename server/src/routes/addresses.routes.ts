import { Router } from 'express';
import {
  createAddress,
  deleteAddress,
  getAddresses,
  updateAddress,
} from '../controllers/addresses.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const addressesRouter = Router();

addressesRouter.use(requireAuth);
addressesRouter.get('/', getAddresses);
addressesRouter.post('/', createAddress);
addressesRouter.patch('/:id', updateAddress);
addressesRouter.put('/:id', updateAddress);
addressesRouter.delete('/:id', deleteAddress);
