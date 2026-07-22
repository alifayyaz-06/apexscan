const WaiterSession = require('../models/WaiterSession');

class WaiterSessionController {
  /**
   * POST /api/v1/waiter/sessions/start
   * Start serving a table
   */
  static async startSession(req, res) {
    try {
      const { tableId, restaurantSlug } = req.body;
      const targetSlug = restaurantSlug || req.restaurantSlug || req.user?.restaurantSlug || 'default';
      const waiterId = req.user?.id || req.user?.staffId || 'waiter_default';
      const waiterName = req.user?.displayName || req.user?.name || 'Waiter';

      if (!tableId) {
        return res.status(400).json({ success: false, message: 'tableId is required.' });
      }

      // Check if table already has an active waiter session
      const existingSession = await WaiterSession.getActiveForTable(tableId, targetSlug);
      if (existingSession && existingSession.waiter_id !== waiterId) {
        return res.status(409).json({
          success: false,
          message: `Table ${tableId} is already occupied by ${existingSession.waiter_name || 'another waiter'}.`
        });
      }

      const session = await WaiterSession.start({
        waiterId,
        waiterName,
        tableId,
        restaurantSlug: targetSlug
      });

      // Broadcast WebSocket notification to clients
      try {
        const serverModule = require('../../server');
        if (serverModule && typeof serverModule.broadcast === 'function') {
          serverModule.broadcast({
            type: 'WAITER_SESSION_STARTED',
            restaurantSlug: targetSlug,
            tableId: session.table_id,
            waiterName: session.waiter_name,
            session
          });
        }
      } catch (wsErr) {}

      return res.status(200).json({
        success: true,
        message: `Started serving Table ${session.table_id}`,
        data: session
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/v1/waiter/sessions/active?restaurant=slug
   * Retrieve active table sessions for a restaurant
   */
  static async getActiveSessions(req, res) {
    try {
      const targetSlug = req.query.restaurant || req.restaurantSlug || req.user?.restaurantSlug || 'default';
      const sessions = await WaiterSession.getAllActive(targetSlug);
      return res.status(200).json({ success: true, data: sessions });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/v1/waiter/sessions/end
   * End a waiter session for a table
   */
  static async endSession(req, res) {
    try {
      const { tableId, restaurantSlug } = req.body;
      const targetSlug = restaurantSlug || req.restaurantSlug || req.user?.restaurantSlug || 'default';

      if (!tableId) {
        return res.status(400).json({ success: false, message: 'tableId is required.' });
      }

      await WaiterSession.endForTable(tableId, targetSlug);

      try {
        const serverModule = require('../../server');
        if (serverModule && typeof serverModule.broadcast === 'function') {
          serverModule.broadcast({
            type: 'WAITER_SESSION_ENDED',
            restaurantSlug: targetSlug,
            tableId
          });
        }
      } catch (wsErr) {}

      return res.status(200).json({
        success: true,
        message: `Table ${tableId} session ended.`
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = WaiterSessionController;
