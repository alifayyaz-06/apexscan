const crypto = require('crypto');

// In-memory registry for fast table code mapping
// Key: `${slug}:${tableNumber}` -> Value: `code`
// Reverse Key: `${slug}:${code}` -> Value: `tableNumber`
const codeRegistry = new Map();

// Exclude ambiguous characters (0, O, 1, I) for clear reading & scanning
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRandomCode(length = 6) {
  let code = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += CHARS[bytes[i] % CHARS.length];
  }
  return code;
}

class TableCodeManager {
  /**
   * Get or create a random table code for a restaurant & table number
   */
  static getTableCode(restaurantSlug, tableNumber) {
    const slug = (restaurantSlug || 'default').toLowerCase();
    const tbl = String(tableNumber);
    const key = `${slug}:${tbl}`;

    if (codeRegistry.has(key)) {
      return codeRegistry.get(key);
    }

    // Generate fresh random 6-char alphanumeric code (e.g. X9QK72)
    let code;
    do {
      code = generateRandomCode(6);
    } while (codeRegistry.has(`${slug}:${code}`));

    codeRegistry.set(key, code);
    codeRegistry.set(`${slug}:${code}`, tbl);

    return code;
  }

  /**
   * Resolve a 6-character random table code to internal numeric table number
   */
  static resolveCode(restaurantSlug, code) {
    if (!code) return null;
    const slug = (restaurantSlug || 'default').toLowerCase();
    const cleanCode = String(code).trim().toUpperCase();

    // Ensure initial registry populated for tables 1..50
    for (let i = 1; i <= 50; i++) {
      this.getTableCode(slug, i);
    }

    // 1. Check if cleanCode is a random table code (e.g. X9QK72)
    const reverseKey = `${slug}:${cleanCode}`;
    if (codeRegistry.has(reverseKey)) {
      return {
        tableNumber: codeRegistry.get(reverseKey),
        tableCode: cleanCode,
        restaurantSlug: slug
      };
    }

    // 2. Check if cleanCode is a numeric table number (e.g. "1", "2")
    const tableKey = `${slug}:${cleanCode}`;
    if (codeRegistry.has(tableKey)) {
      const actualCode = codeRegistry.get(tableKey);
      return {
        tableNumber: cleanCode,
        tableCode: actualCode,
        restaurantSlug: slug
      };
    }

    return null;
  }

  /**
   * Regenerate a table code (invalidates old QR code)
   */
  static regenerateCode(restaurantSlug, tableNumber) {
    const slug = (restaurantSlug || 'default').toLowerCase();
    const tbl = String(tableNumber);
    const key = `${slug}:${tbl}`;

    if (codeRegistry.has(key)) {
      const oldCode = codeRegistry.get(key);
      codeRegistry.delete(`${slug}:${oldCode}`);
    }

    let newCode;
    do {
      newCode = generateRandomCode(6);
    } while (codeRegistry.has(`${slug}:${newCode}`));

    codeRegistry.set(key, newCode);
    codeRegistry.set(`${slug}:${newCode}`, tbl);

    return newCode;
  }

  /**
   * Get list of all table codes for a restaurant
   */
  static getAllTableCodes(restaurantSlug, count = 20) {
    const slug = (restaurantSlug || 'default').toLowerCase();
    const result = [];
    for (let i = 1; i <= count; i++) {
      const tbl = String(i);
      const code = this.getTableCode(slug, tbl);
      result.push({ tableNumber: tbl, tableCode: code });
    }
    return result;
  }
}

module.exports = TableCodeManager;
