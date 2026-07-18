const dotenv = require("dotenv");
const path = require("path");

// Load .env
dotenv.config({
  path: path.join(__dirname, "../../.env"),
});

const config = {
  // Supabase
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

  // Server
  port: parseInt(process.env.PORT || "3005", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  // Frontend (Vercel)
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3006",

  // Admin
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL,

  // JWT
  jwtSecret: process.env.JWT_SECRET,

  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}_refresh`,

  // Brevo Email API
  brevoApiKey: process.env.BREVO_API_KEY,

  brevoSenderEmail: process.env.BREVO_SENDER_EMAIL,

  brevoSenderName: process.env.BREVO_SENDER_NAME || "Smart QR Ordering System",

  // Rate limit
  disableRateLimit: process.env.DISABLE_RATE_LIMIT === "true",
};

// Required environment variables
const required = [
  "SUPABASE_URL",
  "SUPABASE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPER_ADMIN_EMAIL",
  "JWT_SECRET",
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`CRITICAL CONFIGURATION ERROR: ${key} is missing`);
  }
}

// Brevo validation
if (!config.brevoApiKey || !config.brevoSenderEmail) {
  throw new Error(
    "CRITICAL CONFIGURATION ERROR: BREVO_API_KEY and BREVO_SENDER_EMAIL are required",
  );
}

module.exports = config;
