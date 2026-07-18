const rateLimit = require('express-rate-limit');
const envs = require('../config/envs');

const skipRateLimit = () => envs.disableRateLimit === true;

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.'
    });
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again in 15 minutes.'
    });
  }
});

const orderLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many orders placed. Please wait a few minutes.'
    });
  }
});

module.exports = { globalLimiter, authLimiter, orderLimiter };
