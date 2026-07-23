const TableCodeManager = require('../utils/tableCodeManager');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'antigravity-pos-secret-key-2026';

class QRController {
  /**
   * GET /api/v1/qr/generate?table=1&restaurant=slug
   * Returns unique random table code (e.g. X9QK72) and secure QR URL for a table.
   */
  static async generateToken(req, res) {
    try {
      const table = req.query.table || req.body.table || '1';
      const restaurant = req.query.restaurant || req.body.restaurant || req.restaurantSlug || 'default';

      const tableCode = TableCodeManager.getTableCode(restaurant, table);
      const host = req.get('host');
      const protocol = req.protocol;
      const qrUrl = `${protocol}://${host}/r/${restaurant}/customer?table=${table}&t=${tableCode}`;

      // Create a signed JWT session for backwards safety if required
      const token = jwt.sign({ table, tableNumber: table, tableCode, restaurantId: restaurant }, JWT_SECRET, { expiresIn: '365d' });

      return res.status(200).json({
        success: true,
        data: {
          table: String(table),
          tableNumber: String(table),
          tableCode,
          restaurant: String(restaurant),
          token,
          qrUrl
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/v1/qr/tables?restaurant=slug&count=20
   * Batch fetches all random table codes for a restaurant
   */
  static async getAllTables(req, res) {
    try {
      const restaurant = req.query.restaurant || req.restaurantSlug || 'default';
      const count = parseInt(req.query.count || '20', 10);
      const tables = TableCodeManager.getAllTableCodes(restaurant, count);
      return res.status(200).json({ success: true, data: tables });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/v1/tables/resolve?code=X9QK72&restaurant=slug
   * POST /api/v1/qr/verify
   * Customer opens ?table=X9QK72. Resolves random code to internal table identity.
   */
  static async verifyQRToken(req, res) {
    try {
      const code = req.query.code || req.body.code || req.body.token;
      const table = req.query.table || req.body.table;
      const restaurant = req.query.restaurant || req.body.restaurant || req.restaurantSlug || 'default';
      const supabase = require('../utils/supabase').defaultClient;

      if (!code) {
        return res.status(400).json({ success: false, message: 'Table code is required.' });
      }

      // Check if it's a signed JWT token or a 6-character random table code
      let resolved = TableCodeManager.resolveCode(restaurant, code);

      if (!resolved) {
        // Attempt JWT token verify fallback if a token string was passed
        try {
          const decoded = jwt.verify(code, JWT_SECRET);
          if (decoded && (decoded.table || decoded.tableNumber)) {
            resolved = {
              tableNumber: String(decoded.tableNumber || decoded.table),
              tableCode: decoded.tableCode || code,
              restaurantSlug: restaurant
            };
          }
        } catch (e) {}
      }

      // If still not resolved -> Check if table is occupied for duplicate occupied scan overlay
      if (!resolved) {
        if (table) {
          try {
            const { data: activeOrders } = await supabase.rpc('query_tenant', {
              tenant_slug: restaurant,
              table_name: 'orders',
              operation: 'SELECT_ACTIVE'
            });

            const tableOrder = (activeOrders || []).find(o => {
              const oTable = (o.table_name || o.table || '').toString();
              const targetTable = (table || '').toString();
              return oTable === targetTable || oTable === `Table ${targetTable}` || `Table ${oTable}` === targetTable;
            });

            if (tableOrder) {
              return res.status(200).json({
                success: true,
                data: {
                  sessionId: 'occupied-mismatch-session',
                  table: String(table),
                  tableNumber: String(table),
                  tableCode: code,
                  restaurantId: restaurant,
                  isOccupiedMismatch: true,
                  activeOrderId: tableOrder.id,
                  orderNumber: tableOrder.order_number,
                  status: tableOrder.status
                }
              });
            }
          } catch (rpcErr) {
            console.error('[verifyQRToken] RPC active orders fetch failed:', rpcErr.message);
          }
        }

        return res.status(404).json({
          success: false,
          message: `Invalid or unassigned table code "${code}". Table access denied.`
        });
      }

      // Create session JWT
      const sessionJwt = jwt.sign({
        tableNumber: resolved.tableNumber,
        tableCode: resolved.tableCode,
        restaurantId: restaurant
      }, JWT_SECRET, { expiresIn: '12h' });

      return res.status(200).json({
        success: true,
        data: {
          sessionId: sessionJwt,
          table: resolved.tableNumber,
          tableNumber: resolved.tableNumber,
          tableCode: resolved.tableCode,
          restaurantId: restaurant
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/v1/qr/regenerate
   * Admin panel action: Regenerates a table code, invalidating the old QR stand.
   */
  static async regenerateCode(req, res) {
    try {
      const { table, restaurant } = req.body;
      if (!table || !restaurant) {
        return res.status(400).json({ success: false, message: 'table and restaurant are required.' });
      }

      const newCode = TableCodeManager.regenerateCode(restaurant, table);
      const host = req.get('host');
      const protocol = req.protocol;
      const qrUrl = `${protocol}://${host}/r/${restaurant}/customer?table=${table}&t=${newCode}`;

      return res.status(200).json({
        success: true,
        data: {
          table: String(table),
          tableNumber: String(table),
          tableCode: newCode,
          restaurant: String(restaurant),
          qrUrl
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Resolve session helper for OrderController
   */
  static resolveSession(sessionIdOrCode, targetSlug = 'default') {
    if (!sessionIdOrCode) return null;

    const cleanStr = String(sessionIdOrCode).trim();
    if (cleanStr.length === 6) {
      const resolved = TableCodeManager.resolveCode(targetSlug, cleanStr) ||
                       TableCodeManager.resolveCode('cheezious', cleanStr) ||
                       TableCodeManager.resolveCode('default', cleanStr);
      if (resolved) return { table: resolved.tableNumber, restaurantId: resolved.restaurantSlug };
    }

    try {
      const decoded = jwt.verify(sessionIdOrCode, JWT_SECRET);
      if (decoded && (decoded.table || decoded.tableNumber)) {
        return {
          table: String(decoded.tableNumber || decoded.table),
          restaurantId: decoded.restaurantId
        };
      }
    } catch (e) {
      try {
        const parts = sessionIdOrCode.split('.');
        if (parts.length >= 2) {
          const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
          const decoded = JSON.parse(payloadStr);
          if (decoded && (decoded.table || decoded.tableNumber)) {
            return {
              table: String(decoded.tableNumber || decoded.table),
              restaurantId: decoded.restaurantId
            };
          }
        }
      } catch (err) {}
    }

    const resolvedFallback = TableCodeManager.resolveCode(targetSlug, cleanStr) ||
                             TableCodeManager.resolveCode('cheezious', cleanStr);
    if (resolvedFallback) {
      return { table: resolvedFallback.tableNumber, restaurantId: resolvedFallback.restaurantSlug };
    }

    return null;
  }
}

module.exports = QRController;
