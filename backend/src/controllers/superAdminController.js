const supabase = require('../utils/supabase');

class SuperAdminController {
  /**
   * GET /api/v1/super/restaurants — List all active (non-deleted) restaurants
   */
  static async getAllRestaurants(req, res) {
    try {
      let { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42703' || error.message.includes('deleted_at')) {
          console.warn('SaaS migration columns missing. Falling back to basic restaurants list...');
          const fallbackResult = await supabase
            .from('restaurants')
            .select('*')
            .order('created_at', { ascending: false });
          
          data = fallbackResult.data;
          error = fallbackResult.error;
        }
      }

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/v1/super/restaurants — Invite/Create a new restaurant
   */
  static async createRestaurant(req, res) {
    try {
      const { name, slug, ownerEmail, plan, subscriptionType, subscriptionDays } = req.body;
      if (!name || !slug || !ownerEmail) {
        return res.status(400).json({ success: false, message: 'name, slug, and ownerEmail are required.' });
      }

      const cleanOwnerEmail = ownerEmail.toLowerCase().trim();
      const formattedSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-');

      // 1. Enforce unique slug check before creation (ignoring soft-deleted ones)
      const { data: existingSlug } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', formattedSlug)
        .is('deleted_at', null)
        .maybeSingle();

      if (existingSlug) {
        return res.status(409).json({ success: false, message: 'This restaurant slug is already registered. Please choose another slug.' });
      }

      const now = new Date();
      const isUnlimited = subscriptionType === 'unlimited';
      const days = subscriptionDays || 30;

      const insertData = {
        name,
        slug: formattedSlug,
        owner_email: cleanOwnerEmail,
        plan: plan || 'trial',
        subscription_status: isUnlimited ? 'unlimited' : 'active',
        activated_at: now.toISOString(),
        subscription_days: isUnlimited ? null : days,
        expires_at: isUnlimited ? null : new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
      };

      let { data, error } = await supabase
        .from('restaurants')
        .insert([insertData])
        .select()
        .maybeSingle();

      if (error) {
        if (error.code === '42703' || error.message.includes('expires_at') || error.message.includes('slug')) {
          console.warn('SaaS migration columns missing. Retrying insert with basic columns only...');
          const fallbackResult = await supabase
            .from('restaurants')
            .insert([{
              name,
              owner_email: cleanOwnerEmail,
              is_active: true
            }])
            .select()
            .maybeSingle();

          data = fallbackResult.data;
          error = fallbackResult.error;
        }
      }

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ success: false, message: 'Slug or owner email already registered.' });
        }
        throw error;
      }

      // 2. Call Postgres stored function RPC to provision private tenant schema
      if (data && data.slug) {
        console.log(`Provisioning database schema for new restaurant: tenant_${data.slug.replace(/-/g, '_')}`);
        const { error: schemaErr } = await supabase.rpc('create_tenant_schema', {
          tenant_slug: data.slug
        });
        if (schemaErr) {
          console.error(`Error provisioning schema for ${data.slug}:`, schemaErr.message);
        }
      }

      return res.status(201).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * PATCH /api/v1/super/restaurants/:id — Update subscription details or name
   */
  static async updateRestaurant(req, res) {
    try {
      const { id } = req.params;
      const { name, slug, isActive, plan, subscriptionType, subscriptionDays } = req.body;

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (slug !== undefined) updates.slug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      if (isActive !== undefined) updates.is_active = isActive;
      if (plan !== undefined) updates.plan = plan;

      if (subscriptionType === 'unlimited') {
        updates.subscription_status = 'unlimited';
        updates.expires_at = null;
        updates.subscription_days = null;
        updates.activated_at = new Date().toISOString();
      } else if (subscriptionType === 'limited' || subscriptionDays) {
        const days = subscriptionDays || 30;
        const activationDate = new Date();
        updates.subscription_status = 'active';
        updates.activated_at = activationDate.toISOString();
        updates.subscription_days = days;
        updates.expires_at = new Date(activationDate.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, message: 'No fields to update.' });
      }

      let { data, error } = await supabase
        .from('restaurants')
        .update(updates)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .maybeSingle();

      if (error) {
        if (error.code === '42703' || error.message.includes('deleted_at') || error.message.includes('expires_at')) {
          console.warn('SaaS migration columns missing. Retrying update with basic fields only...');
          const basicUpdates = {};
          if (name !== undefined) basicUpdates.name = name;
          if (isActive !== undefined) basicUpdates.is_active = isActive;

          const fallbackResult = await supabase
            .from('restaurants')
            .update(basicUpdates)
            .eq('id', id)
            .select()
            .maybeSingle();

          data = fallbackResult.data;
          error = fallbackResult.error;
        }
      }

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * DELETE /api/v1/super/restaurants/:id — Hard delete a restaurant and drop its database schema
   */
  static async deleteRestaurant(req, res) {
    try {
      const { id } = req.params;

      // 1. Fetch the restaurant details to get the slug
      const { data: restaurant, error: fetchErr } = await supabase
        .from('restaurants')
        .select('slug')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      // 2. Drop the corresponding PostgreSQL tenant schema cascade
      if (restaurant && restaurant.slug) {
        console.log(`Dropping database schema for restaurant: tenant_${restaurant.slug.replace(/-/g, '_')}`);
        const { error: dropErr } = await supabase.rpc('drop_tenant_schema', {
          tenant_slug: restaurant.slug
        });
        if (dropErr) {
          console.error(`Error dropping schema for ${restaurant.slug}:`, dropErr.message);
          // If RPC fails (e.g. not created yet in SQL editor), log it and continue to delete metadata
        }
      }

      // 3. Perform hard delete of the restaurant metadata record
      const { error: deleteErr } = await supabase
        .from('restaurants')
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;

      return res.status(200).json({ success: true, message: 'Restaurant and its entire database schema deleted successfully.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/v1/super/trial-history — List all trial registrations
   */
  static async getTrialHistory(req, res) {
    try {
      const { data, error } = await supabase
        .from('trial_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * PATCH /api/v1/super/restaurants/:id/trial/extend
   */
  static async extendTrial(req, res) {
    try {
      const { id } = req.params;
      const { days } = req.body; // Can be positive (extend) or negative (shorten)
      if (days === undefined || isNaN(days)) {
        return res.status(400).json({ success: false, message: 'Number of days is required.' });
      }

      // Fetch current restaurant details
      const { data: restaurant, error: fetchErr } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!restaurant) {
        return res.status(404).json({ success: false, message: 'Restaurant not found.' });
      }

      const currentExpiresAt = restaurant.expires_at ? new Date(restaurant.expires_at) : new Date();
      const currentNow = new Date();

      // If already expired, extend from now; otherwise extend from current expiry date
      const baseDate = currentExpiresAt > currentNow ? currentExpiresAt : currentNow;
      const newExpiresAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

      const updates = {
        expires_at: newExpiresAt.toISOString(),
        subscription_status: newExpiresAt > currentNow ? 'active' : 'expired'
      };

      const { data, error } = await supabase
        .from('restaurants')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * PATCH /api/v1/super/restaurants/:id/trial/end
   */
  static async endTrial(req, res) {
    try {
      const { id } = req.params;

      const updates = {
        expires_at: new Date().toISOString(),
        subscription_status: 'expired'
      };

      const { data, error } = await supabase
        .from('restaurants')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * PATCH /api/v1/super/restaurants/:id/trial/convert
   */
  static async convertTrialToPaid(req, res) {
    try {
      const { id } = req.params;
      const { subscriptionDays } = req.body;
      const days = parseInt(subscriptionDays, 10) || 30;

      // Fetch restaurant to get owner email
      const { data: restaurant, error: fetchErr } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!restaurant) {
        return res.status(404).json({ success: false, message: 'Restaurant not found.' });
      }

      const activationDate = new Date();
      const updates = {
        plan: 'premium',
        subscription_status: 'active',
        activated_at: activationDate.toISOString(),
        subscription_days: days,
        expires_at: new Date(activationDate.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
      };

      const { data, error } = await supabase
        .from('restaurants')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;

      // Mark subscription_purchased = true in trial_history
      if (restaurant.owner_email) {
        await supabase
          .from('trial_history')
          .update({ subscription_purchased: true })
          .ilike('email', restaurant.owner_email.trim());
      }

      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = SuperAdminController;
