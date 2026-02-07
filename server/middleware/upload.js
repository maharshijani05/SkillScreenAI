import multer from 'multer';

// Use memory storage for cloud deployments (Render has ephemeral disk)
// The file buffer is available at req.file.buffer
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept PDF and text files
  if (file.mimetype === 'application/pdf' || file.mimetype === 'text/plain') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and text files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export default upload;
