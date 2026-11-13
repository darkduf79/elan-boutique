import { Router } from 'express';
import {
  getSellerDashboard,
  getSellerInvoices,
  getSellerOrders,
  getSellerProducts,
  getSellerProfile,
  getSellerReviews,
  replyToReview,
  updateSellerProfile,
} from '../controllers/seller.controller.js';
import {
  createCoupon,
  deleteCoupon,
  getCoupons,
  updateCoupon,
} from '../controllers/coupons.controller.js';
import { requireSeller } from '../middleware/auth.js';

export const sellerRouter = Router();

sellerRouter.use(requireSeller);

sellerRouter.get('/', getSellerProfile);
sellerRouter.get('/profile', getSellerProfile);
sellerRouter.put('/profile', updateSellerProfile);
sellerRouter.patch('/profile', updateSellerProfile);

sellerRouter.get('/dashboard', getSellerDashboard);
sellerRouter.get('/products', getSellerProducts);
sellerRouter.get('/orders', getSellerOrders);
sellerRouter.get('/invoices', getSellerInvoices);
sellerRouter.get('/reviews', getSellerReviews);

sellerRouter.post('/reviews/:id/reply', replyToReview);
sellerRouter.put('/reviews/:id/reply', replyToReview);

sellerRouter.get('/coupons', getCoupons);
sellerRouter.post('/coupons', createCoupon);
sellerRouter.patch('/coupons/:id', updateCoupon);
sellerRouter.put('/coupons/:id', updateCoupon);
sellerRouter.delete('/coupons/:id', deleteCoupon);
