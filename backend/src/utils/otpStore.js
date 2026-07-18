const store = new Map();

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

function generate() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function set(email, otp) {
  store.set(email.toLowerCase(), {
    otp,
    attempts: 0,
    expiresAt: Date.now() + OTP_EXPIRY_MS
  });
}

function verify(email, otp) {
  const key = email.toLowerCase();
  const entry = store.get(key);
  if (!entry) return { valid: false, reason: 'No reset request found. Please request a new code.' };
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return { valid: false, reason: 'Code expired. Please request a new one.' };
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    store.delete(key);
    return { valid: false, reason: 'Too many failed attempts. Please request a new code.' };
  }
  if (entry.otp !== otp.trim()) {
    entry.attempts++;
    return { valid: false, reason: 'Invalid code. Please try again.' };
  }
  store.delete(key);
  return { valid: true };
}

function remove(email) {
  store.delete(email.toLowerCase());
}

module.exports = { generate, set, verify, remove };
