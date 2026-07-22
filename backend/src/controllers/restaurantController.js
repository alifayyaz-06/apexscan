const { defaultClient } = require('../utils/supabase');
const supabase = defaultClient;

class RestaurantController {
  /**
   * GET /api/v1/restaurants/public/:slug
   * Retrieve public branding & configuration settings for a restaurant by slug
   */
  static async getPublicDetails(req, res) {
    try {
      const { slug } = req.params;
      if (!slug) {
        return res.status(400).json({ success: false, message: 'Restaurant slug is required.' });
      }

      const { data, error } = await supabase
        .from('restaurants')
        .select('name, slug, logo_url, phone, address, email, tax_rate, service_charge')
        .eq('slug', slug)
        .is('deleted_at', null)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return res.status(404).json({ success: false, message: 'Restaurant not found or inactive.' });
      }

      return res.status(200).json({ success: true, data });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/v1/restaurants/settings
   * Retrieve full configurations for the authenticated restaurant admin
   */
  static async getSettings(req, res) {
    try {
      const restaurantId = req.user?.restaurantId || req.restaurantId;
      const restaurantSlug = req.user?.restaurantSlug || req.restaurantSlug || req.query.restaurant;

      let query = supabase.from('restaurants').select('*');
      if (restaurantId && restaurantId !== 'default') {
        query = query.eq('id', restaurantId);
      } else if (restaurantSlug) {
        query = query.eq('slug', restaurantSlug.toLowerCase());
      } else {
        query = query.is('deleted_at', null).limit(1);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return res.status(200).json({ success: true, data: data || {} });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /api/v1/restaurants/settings
   * Update settings for the authenticated restaurant admin
   */
  static async updateSettings(req, res) {
    try {
      const restaurantId = req.user?.restaurantId;
      if (!restaurantId) {
        return res.status(400).json({ success: false, message: 'Restaurant context not found.' });
      }

      const { name, logo_url, phone, address, email, tax_rate, service_charge } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (logo_url !== undefined) updateData.logo_url = logo_url;
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (email !== undefined) updateData.email = email;
      if (tax_rate !== undefined) updateData.tax_rate = parseFloat(tax_rate);
      if (service_charge !== undefined) updateData.service_charge = parseFloat(service_charge);

      const { data, error } = await supabase
        .from('restaurants')
        .update(updateData)
        .eq('id', restaurantId)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = RestaurantController;
