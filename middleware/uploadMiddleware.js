const multer = require('multer');
const path = require('path');

// 1. Where to save the file?
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/'); // Make sure this folder exists in your project root!
  },
  filename(req, file, cb) {
    // Rename file to prevent duplicates (e.g. "image-1238912.jpg")
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// 2. Filter (Only accept Images)
function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb('Images only!');
  }
}

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

module.exports = upload;