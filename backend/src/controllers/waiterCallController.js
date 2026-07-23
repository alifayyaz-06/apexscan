const WaiterCall = require('../models/WaiterCall');
const WaiterSession = require('../models/WaiterSession');

class WaiterCallController {
  /**
   * POST /api/v1/orders/call-waiter
   * Customer requests assistance from their table.
   */
  static async callWaiter(req, res) {
    try {
      const { table, restaurantSlug } = req.body;
      if (!table || !restaurantSlug) {
        return res.status(400).json({ success: false, message: 'Table and restaurantSlug are required.' });
      }

      // 1. Resolve if table has an active waiter session
      const session = await WaiterSession.getActiveForTable(table, restaurantSlug);
      const waiterId = session ? session.waiter_id : 'unassigned';

      // 2. Create the call request
      const call = await WaiterCall.create({
        tableId: table,
        waiterId,
        restaurantSlug
      });

      // 3. Broadcast real-time call event to the targeted waiter (or all if unassigned)
      const broadcast = req.app.get('wssBroadcast');
      if (broadcast) {
        broadcast({
          type: 'CALL_WAITER',
          restaurantSlug,
          targetWaiterId: waiterId === 'unassigned' ? null : waiterId,
          call: {
            id: call.id,
            table: String(table),
            tableName: `Table ${table}`,
            restaurantName: restaurantSlug,
            requestTime: call.created_at,
            status: 'waiting'
          }
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Your waiter has been notified and will assist you shortly.'
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/v1/waiter/calls/active
   * Retrieve active fifo calls queue for the logged-in waiter.
   */
  static async getActiveCalls(req, res) {
    try {
      const waiterId = req.user?.id || req.user?.staffId || req.query.waiterId;
      const slug = req.restaurantSlug || req.query.restaurant || 'default';

      if (!waiterId) {
        return res.status(400).json({ success: false, message: 'Waiter identifier is required.' });
      }

      const calls = await WaiterCall.getActiveForWaiter(waiterId, slug);
      
      // Map to return clear details for the waiter UI queue
      const mappedCalls = calls.map(c => ({
        id: c.id,
        table: c.table_id,
        tableName: `Table ${c.table_id}`,
        restaurantName: slug,
        requestTime: c.created_at,
        status: c.status
      }));

      return res.status(200).json({ success: true, data: mappedCalls });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/v1/waiter/calls/:id/acknowledge
   * Waiter acknowledges a customer assistance request.
   */
  static async acknowledgeCall(req, res) {
    try {
      const { id } = req.params;
      const slug = req.restaurantSlug || req.query.restaurant || 'default';

      await WaiterCall.updateStatus(id, 'accepted', slug);

      // Notify customer via WebSocket broadcast
      const broadcast = req.app.get('wssBroadcast');
      if (broadcast) {
        broadcast({
          type: 'WAITER_ACKNOWLEDGED',
          restaurantSlug: slug,
          callId: id,
          message: 'Your waiter is on the way.'
        });
      }

      return res.status(200).json({ success: true, message: 'Call request acknowledged.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/v1/waiter/calls/:id/dismiss
   * Waiter dismisses/completes a customer assistance request.
   */
  static async dismissCall(req, res) {
    try {
      const { id } = req.params;
      const slug = req.restaurantSlug || req.query.restaurant || 'default';

      await WaiterCall.updateStatus(id, 'dismissed', slug);

      // Notify customer via WebSocket broadcast
      const broadcast = req.app.get('wssBroadcast');
      if (broadcast) {
        broadcast({
          type: 'WAITER_DISMISSED',
          restaurantSlug: slug,
          callId: id
        });
      }

      return res.status(200).json({ success: true, message: 'Call request dismissed.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = WaiterCallController;
