import { Router } from 'express';
import { createPaymentIntent } from '../controllers/payments.controller.js';

export const paymentsRouter = Router();

paymentsRouter.post('/create-intent', createPaymentIntent);
