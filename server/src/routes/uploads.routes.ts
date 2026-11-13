import { NextFunction, Request, Response, Router } from 'express';
import multer from 'multer';
import { uploadImage, uploadMiddleware } from '../controllers/uploads.controller.js';
import { requireSeller } from '../middleware/auth.js';

export const uploadsRouter = Router();

function handleUpload(req: Request, res: Response, next: NextFunction): void {
  uploadMiddleware(req, res, (error: any) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      res.status(400).json({
        error:
          error.code === 'LIMIT_FILE_SIZE'
            ? 'L’image dépasse la taille maximale de 5 Mo.'
            : `Téléversement invalide : ${error.message}`,
      });
      return;
    }
    res.status(400).json({ error: error.message || 'Téléversement invalide.' });
  });
}

uploadsRouter.post('/', requireSeller, handleUpload, uploadImage);
