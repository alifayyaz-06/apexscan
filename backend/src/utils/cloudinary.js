const cloudinary = require('cloudinary').v2;
const envs = require('../config/envs');

const isCloudinaryConfigured = !!(
  envs.cloudinaryCloudName &&
  envs.cloudinaryApiKey &&
  envs.cloudinaryApiSecret
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: envs.cloudinaryCloudName,
    api_key: envs.cloudinaryApiKey,
    api_secret: envs.cloudinaryApiSecret
  });
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured
};
