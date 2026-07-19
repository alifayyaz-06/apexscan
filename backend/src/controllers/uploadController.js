const multer = require('multer');
const path = require('path');
const { cloudinary, isCloudinaryConfigured } = require('../utils/cloudinary');

// Multer memory storage (keeps file in RAM, then uploads to Cloudinary)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed.'));
    }
  }
});

class UploadController {
  static getMiddleware() {
    return upload.single('image');
  }

  static async uploadImage(req, res) {
    try {
      if (!isCloudinaryConfigured) {
        return res.status(400).json({
          success: false,
          message: 'Cloudinary is not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env file to enable image uploads.'
        });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file provided.' });
      }

      const file = req.file;
      
      // Use tenant slug or ID for folder partitioning
      const tenantFolder = `smart-ordering/${req.restaurantSlug || 'general'}`;

      // Helper function to stream buffer to Cloudinary
      const uploadStreamPromise = (buffer, folder) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: folder,
              resource_type: 'image'
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          stream.end(buffer);
        });
      };

      const result = await uploadStreamPromise(file.buffer, tenantFolder);

      return res.status(200).json({
        success: true,
        data: {
          url: result.secure_url,
          public_id: result.public_id,
          fileName: result.original_filename
        }
      });
    } catch (err) {
      console.error('Cloudinary upload error:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = UploadController;
