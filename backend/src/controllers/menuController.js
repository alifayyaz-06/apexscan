const { randomUUID } = require('crypto');
const Menu = require('../models/Menu');
const { defaultClient, getTenantClient } = require('../utils/supabase');

class MenuController {
  static async getMenu(req, res) {
    try {
      // 1. Determine target schema client
      let client = req.supabase;

      if (!client) {
        // Public customer request: restaurant identifier comes from query param
        let restaurantParam = req.query.restaurant || req.query.restaurant_id || req.user?.restaurantSlug || req.restaurantSlug;

        if (restaurantParam) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(restaurantParam)) {
            // It's a UUID, resolve it to slug from public table
            const { data: restData } = await defaultClient
              .from('restaurants')
              .select('slug')
              .eq('id', restaurantParam)
              .maybeSingle();

            if (restData) {
              restaurantParam = restData.slug;
            }
          }
          client = getTenantClient(restaurantParam);
        } else {
          client = defaultClient;
        }
      }

      const items = await Menu.getAll(client);
      return res.status(200).json({ success: true, data: items });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getPublicMenu(req, res) {
    try {
      const slug = req.params.slug || req.query.restaurant;
      if (!slug) {
        return res.status(400).json({ success: false, message: 'Restaurant slug is required.' });
      }
      const client = getTenantClient(slug);
      const items = await Menu.getAll(client);
      return res.status(200).json({ success: true, data: items });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getMenuItem(req, res) {
    try {
      const { id } = req.params;
      const client = req.supabase || defaultClient;
      const item = await Menu.getById(id, client);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Menu item not found' });
      }
      return res.status(200).json({ success: true, data: item });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createMenuItem(req, res) {
    try {
      const { name, category, price, description, image, sizes } = req.body;
      if (!name || !category || price === undefined) {
        return res.status(400).json({ success: false, message: 'Missing required fields: name, category, price.' });
      }

      // Auto-generate a unique ID if none was provided
      const id = (req.body.id && req.body.id.trim()) ? req.body.id.trim() : randomUUID();

      const client = req.supabase || defaultClient;
      const newItem = await Menu.create({
        id, name, category, price: parseFloat(price),
        description: description || '', image: image || '',
        sizes: Array.isArray(sizes) ? sizes : []
      }, client);
      return res.status(201).json({ success: true, data: newItem });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateMenuItem(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const allowedFields = ['name', 'category', 'price', 'description', 'image', 'is_available', 'sizes'];
      const sanitized = {};
      for (const key of allowedFields) {
        if (updates[key] !== undefined) {
          sanitized[key] = key === 'price' ? parseFloat(updates[key]) : updates[key];
        }
      }

      if (Object.keys(sanitized).length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields to update.' });
      }

      const client = req.supabase || defaultClient;
      const updatedItem = await Menu.update(id, sanitized, client);
      return res.status(200).json({ success: true, data: updatedItem });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deleteMenuItem(req, res) {
    try {
      const { id } = req.params;
      const client = req.supabase || defaultClient;
      await Menu.delete(id, client);
      return res.status(200).json({ success: true, message: `Menu item ${id} deleted.` });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = MenuController;
