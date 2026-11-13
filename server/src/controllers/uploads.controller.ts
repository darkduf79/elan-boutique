import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Request, Response } from 'express';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadsDir),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeExtension = /^\.[a-z0-9]{1,6}$/.test(extension) ? extension : '.jpg';
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    callback(null, `elan-${unique}${safeExtension}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME.has(file.mimetype.toLowerCase())) {
      callback(new Error('Format d’image non pris en charge (JPEG, PNG, WEBP, GIF).'));
      return;
    }
    callback(null, true);
  },
}).single('image');

/** Reçoit une image de produit et renvoie son URL publique. */
export function uploadImage(req: Request, res: Response): void {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Aucun fichier reçu (champ « image »).' });
      return;
    }

    const url = `/uploads/${req.file.filename}`;
    res.status(201).json({
      url,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error('Erreur uploadImage:', error);
    res.status(500).json({ error: 'Erreur lors de l’enregistrement de l’image' });
  }
}

export { uploadsDir };
