'use strict';

const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const FOLDER_MAP = {
  'user': 'users',
  'vehicle': 'vehicles',
  'spare-part': 'spare-parts',
  'spare_part': 'spare-parts',
  'part': 'spare-parts',
  'new-part-request': 'new-part-requests',
  'new_part_request': 'new-part-requests'
};

// Ensure root upload directories exist
function ensureUploadDirectories() {
  const baseUploads = path.join(__dirname, '..', 'uploads');
  Object.values(FOLDER_MAP).forEach(folder => {
    const dir = path.join(baseUploads, folder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Initial creation of upload directories
ensureUploadDirectories();

// Disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const rawEntityType = (req.body.entityType || '').trim().toLowerCase().replace(/_/g, '-');
    const entityType = rawEntityType === 'part' ? 'spare-part' : rawEntityType;
    const folder = FOLDER_MAP[entityType] || FOLDER_MAP[rawEntityType];

    if (!folder) {
      return cb(new Error('INVALID_ENTITY_TYPE'));
    }

    const targetDir = path.join(__dirname, '..', 'uploads', folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      const mimeToExt = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp'
      };
      ext = mimeToExt[file.mimetype] || '.jpg';
    } else if (ext === '.jpeg') {
      ext = '.jpg';
    }

    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

// File filter validation
const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error('INVALID_MIME_TYPE'));
  }

  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error('INVALID_EXTENSION'));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
}).single('image');

// Magic bytes content signature verification
function validateMagicBytes(filePath) {
  let fd;
  try {
    const buffer = Buffer.alloc(12);
    fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);
    fd = null;

    if (bytesRead < 8) return false;

    // JPEG: FF D8 FF
    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;

    // PNG: 89 50 4E 47
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;

    // WebP: RIFF (0-3) and WEBP (8-11)
    const isWebp = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
                   buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;

    return isJpeg || isPng || isWebp;
  } catch (err) {
    if (fd) {
      try { fs.closeSync(fd); } catch (e) {}
    }
    return false;
  }
}

// Custom Express middleware wrapper for single image upload
function handleSingleImageUpload(req, res, next) {
  upload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'حجم الملف يتجاوز الحد المسموح به 5 ميجابايت' });
      }
      if (err.message === 'INVALID_ENTITY_TYPE') {
        return res.status(400).json({ message: 'نوع الكيان غير مدعوم. الأنواع المسموح بها: user, vehicle, spare-part, new-part-request' });
      }
      if (err.message === 'INVALID_MIME_TYPE' || err.message === 'INVALID_EXTENSION') {
        return res.status(415).json({ message: 'صيغة الملف غير مدعومة. الصيغ المسموح بها: JPEG, PNG, WebP' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ message: 'يتطلب رفع صورة فردية واحدة فقط بالحقل image' });
      }
      return res.status(400).json({ message: err.message || 'خطأ في رفع الملف' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'لم يتم إرفاق أي صورة' });
    }

    // Verify magic bytes
    if (!validateMagicBytes(req.file.path)) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(415).json({ message: 'محتوى الملف غير صالح أو لا يطابق صيغ الصور المسموح بها' });
    }

    next();
  });
}

module.exports = {
  handleSingleImageUpload,
  ensureUploadDirectories,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  FOLDER_MAP
};
