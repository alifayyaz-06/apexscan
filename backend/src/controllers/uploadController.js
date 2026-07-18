const multer = require('multer');
const path = require('path');
const supabase = require('../utils/supabase');

// Multer memory storage (we keep file in RAM, then push to Supabase Storage)
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
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file provided.' });
      }

      const file = req.file;
      const fileExt = path.extname(file.originalname).toLowerCase();
      const fileName = `menu_${Date.now()}${fileExt}`;
      const filePath = `menu-images/${fileName}`;

      // Auto-ensure public bucket exists
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const hasBucket = buckets && buckets.some(b => b.id === 'menu-images');
        if (!hasBucket) {
          const { error: bucketError } = await supabase.storage.createBucket('menu-images', {
            public: true,
            fileSizeLimit: 5242880
          });
          if (bucketError) {
            console.warn('Auto-create bucket failed:', bucketError.message);
          } else {
            console.log('Successfully created public storage bucket: menu-images');
          }
        }
      } catch (bucketCheckErr) {
        console.warn('Storage bucket check warning:', bucketCheckErr.message);
      }

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('menu-images')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: publicData } = supabase.storage
        .from('menu-images')
        .getPublicUrl(filePath);

      return res.status(200).json({
        success: true,
        data: {
          url: publicData.publicUrl,
          path: filePath,
          fileName: fileName,
        }
      });
    } catch (err) {
      console.error('Image upload error:', err.message);
      if (err.message === 'Bucket not found') {
        return res.status(404).json({
          success: false,
          message: "The Supabase storage bucket 'menu-images' does not exist. Please go to your Supabase Dashboard -> Storage and create a new public bucket named 'menu-images' to enable image uploads."
        });
      }
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = UploadController;
