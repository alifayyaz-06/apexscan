const Order = require('../models/Order');
const QRController = require('./qrController');
const TableCodeManager = require('../utils/tableCodeManager');
const { defaultClient, getTenantClient } = require('../utils/supabase');

class OrderController {
  static async getAllOrders(req, res) {
    try {
      const client = req.supabase || defaultClient;
      const orders = await Order.getAll(client);
      return res.status(200).json({ success: true, data: orders });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getActiveOrders(req, res) {
    try {
      const client = req.supabase || defaultClient;
      const activeOrders = await Order.getActive(client);
      return res.status(200).json({ success: true, data: activeOrders });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getOrderById(req, res) {
    try {
      const { id } = req.params;
      const client = req.supabase || defaultClient;
      const order = await Order.getById(id, client);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      return res.status(200).json({ success: true, data: order });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/v1/orders/track/:id?restaurant=<slug>
   * Public endpoint — no auth required.
   * Allows customers to re-fetch their order status after a page reload.
   * Requires the restaurant slug as a query param for tenant scoping.
   */
  static async trackOrder(req, res) {
    try {
      const { id } = req.params;
      const slug = req.query.restaurant;

      if (!slug) {
        return res.status(400).json({ success: false, message: 'restaurant query param is required.' });
      }

      const client = getTenantClient(slug);
      const order = await Order.getById(id, client);

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found or has expired.' });
      }

      // Only expose safe fields to the customer (no internal billing details beyond total)
      const safeOrder = {
        id: order.id,
        status: order.status,
        table_name: order.table_name,
        items: order.items,
        billing: {
          subtotal: order.billing?.subtotal,
          tax: order.billing?.tax,
          serviceCharge: order.billing?.serviceCharge,
          total: order.billing?.total
        }
      };

      return res.status(200).json({ success: true, data: safeOrder });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/v1/orders/table-status/:table?restaurant=<slug>
   * Public endpoint — checks if a table has an active (unsettled) order.
   */
  static async checkTableStatus(req, res) {
    try {
      const { table } = req.params;
      const slug = req.query.restaurant;

      if (!slug) {
        return res.status(400).json({ success: false, message: 'restaurant query param is required.' });
      }

      const client = getTenantClient(slug);
      const activeOrders = await Order.getActive(client);

      // Find any active order for this table
      const tableOrder = (activeOrders || []).find(o => {
        const oTable = (o.table_name || o.table || '').toString();
        const targetTable = (table || '').toString();
        return (oTable === targetTable || oTable === `Table ${targetTable}` || `Table ${oTable}` === targetTable) &&
               o.status !== 'completed' && o.status !== 'cancelled';
      });

      if (tableOrder) {
        return res.status(200).json({
          success: true,
          occupied: true,
          activeOrderId: tableOrder.id,
          orderNumber: tableOrder.order_number,
          status: tableOrder.status
        });
      }

      return res.status(200).json({ success: true, occupied: false });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createOrder(req, res) {
    try {
      const { table, items, restaurant_id, billing, sessionId, t } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid order request. Items are required.' });
      }

      // 1. Resolve cryptographically verified session/table
      const token = sessionId || t || req.headers['x-session-id'] || req.headers['x-qr-token'];
      let verifiedTable = null;
      let verifiedRestaurantId = null;

      if (token) {
        const resolved = QRController.resolveSession(token);
        if (resolved) {
          verifiedTable = resolved.table;
          verifiedRestaurantId = resolved.restaurantId;
        } else {
          return res.status(403).json({
            success: false,
            message: 'Security Violation: Invalid, expired, or tampered QR table token.'
          });
        }
      }

      // SECURITY ENFORCEMENT:
      // Prevent client table spoofing (e.g. verified session is for Table 5, but client sends Table 6)
      if (verifiedTable && table && String(table).trim().toLowerCase() !== String(verifiedTable).trim().toLowerCase()) {
        return res.status(403).json({
          success: false,
          message: `Security Violation: Table mismatch. Your verified QR session is locked to Table ${verifiedTable}, but the request specified Table ${table}.`
        });
      }

      // Final Table Resolution: Always force verifiedTable if a session is present
      const targetTable = verifiedTable || table;

      if (!targetTable) {
        return res.status(403).json({
          success: false,
          message: 'Security Violation: Table identification required.'
        });
      }

      // restaurant_id can be UUID or Slug
      let restaurantParam = verifiedRestaurantId || req.restaurantSlug || req.restaurantId || restaurant_id;
      let client = req.supabase;
      let resolvedRestaurantId = req.restaurantId;

      if (!client && restaurantParam) {
        // Resolve UUID to Slug
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(restaurantParam)) {
          const { data: restData } = await defaultClient
            .from('restaurants')
            .select('id, slug')
            .eq('id', restaurantParam)
            .maybeSingle();

          if (restData) {
            resolvedRestaurantId = restData.id;
            restaurantParam = restData.slug;
          }
        } else {
          // If it's a slug, resolve its UUID
          const { data: restData } = await defaultClient
            .from('restaurants')
            .select('id, slug')
            .eq('slug', restaurantParam.toLowerCase())
            .maybeSingle();
          if (restData) {
            resolvedRestaurantId = restData.id;
            restaurantParam = restData.slug;
          }
        }
        client = getTenantClient(restaurantParam);
      }

      if (!client) {
        client = defaultClient;
      }

      const newOrder = await Order.create(targetTable, items, client, billing);
      
      // Trigger WebSocket broadcast
      const broadcast = req.app.get('wssBroadcast');
      if (broadcast && (resolvedRestaurantId || restaurantParam)) {
        broadcast({ type: 'ORDER_CREATED', order: newOrder, restaurantId: resolvedRestaurantId, restaurantSlug: restaurantParam });
      }

      return res.status(201).json({ success: true, data: newOrder });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const validStatuses = ['pending', 'confirmed', 'cooking', 'ready', 'served', 'completed', 'cancelled'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing status.' });
      }

      const client = req.supabase || defaultClient;
      const confirmedBy = req.user ? req.user.displayName : 'Staff';
      const updatedOrder = await Order.updateStatus(id, status, confirmedBy, client);
      if (!updatedOrder) {
        return res.status(404).json({ success: false, message: 'Order not found.' });
      }

      if (status === 'completed' || status === 'cancelled') {
        const tblNum = (updatedOrder.table_name || updatedOrder.table || '').toString().replace(/[^0-9]/g, '');
        if (tblNum) {
          TableCodeManager.regenerateCode(req.restaurantSlug || 'default', tblNum);
        }
      }

      // Trigger WebSocket broadcast
      const broadcast = req.app.get('wssBroadcast');
      if (broadcast) {
        broadcast({
          type: 'ORDER_UPDATED',
          order: updatedOrder,
          restaurantId: req.restaurantId || req.restaurantSlug,
          restaurantSlug: req.restaurantSlug || req.restaurantId
        });
      }

      return res.status(200).json({ success: true, data: updatedOrder });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async completeAndPayOrder(req, res) {
    try {
      const { id } = req.params;
      const { paymentMethod } = req.body;

      const validMethods = ['cash', 'card'];
      if (!paymentMethod || !validMethods.includes(paymentMethod)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing payment method.' });
      }

      const client = req.supabase || defaultClient;
      const confirmedBy = req.user ? req.user.displayName : 'Staff';
      const updatedOrder = await Order.completeAndPay(id, paymentMethod, confirmedBy, client);
      if (!updatedOrder) {
        return res.status(404).json({ success: false, message: 'Order not found.' });
      }

      // Regenerate table code so old QR codes are invalidated for the table once bill is paid
      const tblNum = (updatedOrder.table_name || updatedOrder.table || '').toString().replace(/[^0-9]/g, '');
      if (tblNum) {
        TableCodeManager.regenerateCode(req.restaurantSlug || 'default', tblNum);
      }

      // Trigger WebSocket broadcast
      const broadcast = req.app.get('wssBroadcast');
      if (broadcast) {
        broadcast({
          type: 'ORDER_UPDATED',
          order: updatedOrder,
          restaurantId: req.restaurantId || req.restaurantSlug,
          restaurantSlug: req.restaurantSlug || req.restaurantId
        });
      }

      return res.status(200).json({ success: true, data: updatedOrder });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateOrderItems(req, res) {
    try {
      const { id } = req.params;
      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid edit request. Items are required.' });
      }

      const client = req.supabase || defaultClient;
      const updatedOrder = await Order.updateItems(id, items, client);
      if (!updatedOrder) {
        return res.status(404).json({ success: false, message: 'Order not found.' });
      }

      // Trigger WebSocket broadcast
      const broadcast = req.app.get('wssBroadcast');
      if (broadcast && req.restaurantId) {
        broadcast({ type: 'ORDER_UPDATED', order: updatedOrder, restaurantId: req.restaurantId, restaurantSlug: req.restaurantSlug });
      }

      return res.status(200).json({ success: true, data: updatedOrder });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = OrderController;
