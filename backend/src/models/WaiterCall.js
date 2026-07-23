const { defaultClient } = require('../utils/supabase');

// Resilient in-memory fallback store
// Key: `${slug}:${waiterId}` -> Array of Call objects
const waiterCallsFallback = new Map();

class WaiterCall {
  /**
   * Create a new Call Waiter request
   */
  static async create({ tableId, waiterId, restaurantSlug }) {
    const slug = (restaurantSlug || 'default').toLowerCase();
    const cleanTable = String(tableId).replace(/^(table\s*)+/i, '').trim();
    const callId = `C-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const callData = {
      id: callId,
      table_id: cleanTable,
      waiter_id: waiterId,
      restaurant_slug: slug,
      status: 'waiting',
      created_at: new Date().toISOString()
    };

    // 1. Add to in-memory fallback map
    const fallbackKey = `${slug}:${waiterId}`;
    if (!waiterCallsFallback.has(fallbackKey)) {
      waiterCallsFallback.set(fallbackKey, []);
    }
    waiterCallsFallback.get(fallbackKey).push(callData);

    // 2. Persist to DB if possible
    try {
      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'waiter_calls',
        operation: 'INSERT',
        record: callData
      });
      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn('[WaiterCall.create] Database save warning, operating in memory:', e.message);
    }

    return callData;
  }

  /**
   * Get all active calls (waiting/accepted) for a specific waiter
   */
  static async getActiveForWaiter(waiterId, restaurantSlug) {
    const slug = (restaurantSlug || 'default').toLowerCase();
    const fallbackKey = `${slug}:${waiterId}`;
    const fallbackList = waiterCallsFallback.get(fallbackKey) || [];
    const activeFallback = fallbackList.filter(c => c.status === 'waiting' || c.status === 'accepted');

    try {
      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'waiter_calls',
        operation: 'SELECT_BY_FILTER',
        filter_column: 'waiter_id',
        filter_value: waiterId
      });

      if (!error && Array.isArray(data)) {
        // Return only waiting/accepted sorted by creation date (FIFO queue)
        return data
          .filter(c => c.status === 'waiting' || c.status === 'accepted')
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      }
    } catch (e) {
      console.warn('[WaiterCall.getActiveForWaiter] Database read warning, using memory fallback:', e.message);
    }

    return activeFallback.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  /**
   * Update status of a call (e.g. accepted, dismissed)
   */
  static async updateStatus(callId, status, restaurantSlug) {
    const slug = (restaurantSlug || 'default').toLowerCase();

    // 1. Update in-memory fallback map
    for (const [key, list] of waiterCallsFallback.entries()) {
      if (key.startsWith(`${slug}:`)) {
        const item = list.find(c => c.id === callId);
        if (item) {
          item.status = status;
        }
      }
    }

    // 2. Update database
    try {
      await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'waiter_calls',
        operation: 'UPDATE_STATUS',
        filter_column: 'id',
        filter_value: callId,
        new_status: status
      });
    } catch (e) {
      console.warn('[WaiterCall.updateStatus] Database update warning:', e.message);
    }

    return true;
  }
}

module.exports = WaiterCall;
