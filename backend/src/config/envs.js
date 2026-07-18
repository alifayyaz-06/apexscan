const dotenv = require('dotenv');
const path = require('path');

// Load env configuration
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  port: parseInt(process.env.PORT || '3005', 10),
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL,
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET + '_refresh'),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3006',
  nodeEnv: process.env.NODE_ENV || 'development',
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  disableRateLimit: process.env.DISABLE_RATE_LIMIT === 'true'
};

// Validation
const required = ['supabaseUrl', 'supabaseKey', 'superAdminEmail', 'jwtSecret', 'smtpUser', 'smtpPass', 'supabaseServiceRoleKey'];
for (const key of required) {
  if (!config[key]) {
    throw new Error(`CRITICAL CONFIGURATION ERROR: Environment variable "${key.replace(/([A-Z])/g, '_$1').toUpperCase()}" is missing.`);
  }
}

module.exports = config;
