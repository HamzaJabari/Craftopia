const multer = require('multer');
const path = require('path');

// Storage Engine
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Check File Type
function checkFileType(file, cb) {
  // 1. Allowed file extensions
  // Added: mov, avi, wmv, flv, webp, gif
  const filetypes = /jpeg|jpg|png|gif|webp|mp4|mkv|webm|mov|avi|wmv|flv/;
  
  // 2. Check Extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  
  // 3. Check Mime Type
  // Note: 'video/quicktime' is needed for .mov files
  const mimetype = filetypes.test(file.mimetype) || file.mimetype === 'video/quicktime';

  // DEBUG LOGS (This will show in your terminal if something fails)
  console.log(`Checking file: ${file.originalname}`);
  console.log(`Extension: ${path.extname(file.originalname)}`);
  console.log(`Mimetype: ${file.mimetype}`);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    // This is the error you were seeing
    console.error('File Rejected: Invalid File Type');
    cb('Error: Images or Videos Only! (Supported: jpg, png, mp4, mov, avi, webm)');
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // Increased to 100MB for larger videos
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

module.exports = upload;