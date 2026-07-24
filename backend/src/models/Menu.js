const { defaultClient } = require('../utils/supabase');



class Menu {
  static async getAll(supabaseClient = defaultClient) {
    try {
      const slug = supabaseClient.tenantSlug || (typeof supabaseClient === 'string' ? supabaseClient : 'gourmet-bistro-main');
      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'menu',
        operation: 'SELECT_ALL'
      });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error querying Supabase menu:', err.message);
      throw err;
    }
  }

  static async getById(id, supabaseClient = defaultClient) {
    try {
      const slug = supabaseClient.tenantSlug || (typeof supabaseClient === 'string' ? supabaseClient : 'gourmet-bistro-main');
      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'menu',
        operation: 'SELECT_BY_ID',
        query_id: id
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error(`Error querying menu item ${id} from Supabase:`, err.message);
      throw err;
    }
  }

  static async create(itemData, supabaseClient = defaultClient) {
    try {
      const slug = supabaseClient.tenantSlug || (typeof supabaseClient === 'string' ? supabaseClient : 'gourmet-bistro-main');
      const { restaurant_id, ...cleanData } = itemData;

      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'menu',
        operation: 'INSERT',
        payload: cleanData
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error creating menu item in Supabase:', err.message);
      throw err;
    }
  }

  static async update(id, itemData, supabaseClient = defaultClient) {
    try {
      const slug = supabaseClient.tenantSlug || (typeof supabaseClient === 'string' ? supabaseClient : 'gourmet-bistro-main');
      const { restaurant_id, ...cleanData } = itemData;

      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'menu',
        operation: 'UPDATE',
        query_id: id,
        payload: cleanData
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error(`Error updating menu item ${id} in Supabase:`, err.message);
      throw err;
    }
  }

  static async delete(id, supabaseClient = defaultClient) {
    try {
      const slug = supabaseClient.tenantSlug || (typeof supabaseClient === 'string' ? supabaseClient : 'gourmet-bistro-main');
      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'menu',
        operation: 'DELETE',
        query_id: id
      });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error(`Error soft deleting menu item ${id} from Supabase:`, err.message);
      throw err;
    }
  }
}

module.exports = Menu;
module.exports.menuItemsSeed = menuItemsSeed;
