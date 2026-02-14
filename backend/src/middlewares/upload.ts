import path from 'path';
import fs from 'fs';
import multer from 'multer';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// When running inside a packaged Electron app, C:\Program Files\ is read-only.
// Use BACKEND_CWD (set by Electron main process) to determine the base, then
// prefer a writable user-data location (UPLOAD_DIR env) if available.
const baseDir = process.env.UPLOAD_DIR || process.env.BACKEND_CWD || process.cwd();
const UPLOAD_DIR = path.join(baseDir, 'uploads', 'products');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const companyId = (req.query.companyId || req.body?.companyId) as string;
    const dir = companyId ? path.join(UPLOAD_DIR, companyId) : UPLOAD_DIR;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
    cb(null, name);
  },
});

export const uploadProductImage = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = /^image\/(jpeg|jpg|png)$/i;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG or PNG images are allowed'));
    }
  },
}).single('image');
