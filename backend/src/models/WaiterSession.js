const { defaultClient, getTenantClient } = require('../utils/supabase');

// In-memory fallback registry for resilient operation if DB table pending migration
let activeSessionsFallback = {};

class WaiterSession {
  /**
   * Start a waiter session for a table
   */
  static async start({ waiterId, waiterName, tableId, restaurantSlug }) {
    const slug = (restaurantSlug || 'default').toLowerCase();
    const cleanTable = String(tableId).replace(/^(table\s*)+/i, '').trim();

    const sessionData = {
      id: `WS-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      waiter_id: waiterId,
      waiter_name: waiterName || 'Waiter',
      table_id: cleanTable,
      table_name: `Table ${cleanTable}`,
      restaurant_slug: slug,
      started_at: new Date().toISOString(),
      status: 'active'
    };

    // Store in fallback cache first for instant access
    if (!activeSessionsFallback[slug]) {
      activeSessionsFallback[slug] = {};
    }
    activeSessionsFallback[slug][cleanTable] = sessionData;

    try {
      const client = getTenantClient(slug);
      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'waiter_sessions',
        operation: 'INSERT',
        record: sessionData
      });
      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn(`[WaiterSession.start] Supabase DB write notice for table ${cleanTable}:`, e.message);
    }

    return sessionData;
  }

  /**
   * Get active waiter session for a table
   */
  static async getActiveForTable(tableId, restaurantSlug) {
    const slug = (restaurantSlug || 'default').toLowerCase();
    const cleanTable = String(tableId).replace(/^(table\s*)+/i, '').trim();

    if (activeSessionsFallback[slug] && activeSessionsFallback[slug][cleanTable]) {
      return activeSessionsFallback[slug][cleanTable];
    }

    try {
      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'waiter_sessions',
        operation: 'SELECT_BY_FILTER',
        filter_column: 'table_id',
        filter_value: cleanTable
      });
      if (!error && Array.isArray(data)) {
        const active = data.find(s => s.status === 'active');
        if (active) return active;
      }
    } catch (e) {}

    return null;
  }

  /**
   * Get all active sessions for a restaurant
   */
  static async getAllActive(restaurantSlug) {
    const slug = (restaurantSlug || 'default').toLowerCase();
    const fallbackList = Object.values(activeSessionsFallback[slug] || {});

    try {
      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'waiter_sessions',
        operation: 'SELECT_BY_FILTER',
        filter_column: 'status',
        filter_value: 'active'
      });
      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (e) {}

    return fallbackList;
  }

  /**
   * End/close active waiter session for a table
   */
  static async endForTable(tableId, restaurantSlug) {
    const slug = (restaurantSlug || 'default').toLowerCase();
    const cleanTable = String(tableId).replace(/^(table\s*)+/i, '').trim();

    if (activeSessionsFallback[slug] && activeSessionsFallback[slug][cleanTable]) {
      delete activeSessionsFallback[slug][cleanTable];
    }

    try {
      await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'waiter_sessions',
        operation: 'UPDATE_STATUS',
        filter_column: 'table_id',
        filter_value: cleanTable,
        new_status: 'closed'
      });
    } catch (e) {}

    return true;
  }
}

module.exports = WaiterSession;
