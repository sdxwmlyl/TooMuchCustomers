const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../models/database');

const DATA_DIR = path.join(__dirname, '../../data');

// 配置multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const customerId = req.params.customerId;
    db.get('SELECT folder_path FROM customers WHERE id = ?', [customerId], (err, row) => {
      if (err || !row) return cb(new Error('Customer not found'));
      const uploadDir = path.join(row.folder_path, 'raw');
      cb(null, uploadDir);
    });
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const ext = path.extname(file.originalname);
    const prefix = file.mimetype.startsWith('image/') ? 'screenshot' : 'doc';
    cb(null, `${prefix}_${timestamp}_${Math.random().toString(36).substr(2, 6)}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB限制
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
});

// 上传文件
router.post('/:customerId', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({
    filename: req.file.filename,
    path: req.file.path,
    type: req.file.mimetype,
    size: req.file.size
  });
});

module.exports = router;
