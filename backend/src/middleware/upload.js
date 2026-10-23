import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const AVATAR_DIR = path.join(__dirname, '..', '..', 'uploads', 'avatars');

fs.mkdirSync(AVATAR_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  },
});

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const fileFilter = (req, file, cb) => {
  if (!allowedTypes.has(file.mimetype)) {
    cb(new Error('Please upload a JPG, PNG or WEBP image.'));
    return;
  }
  cb(null, true);
};

const uploader = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 },
});

export const uploadAvatar = (req, res, next) => {
  uploader.single('avatar')(req, res, (error) => {
    if (!error) return next();

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'That image is too large. Please choose one under 3MB.' });
    }

    res.status(400).json({ success: false, message: error.message || 'Could not upload that image.' });
  });
};
