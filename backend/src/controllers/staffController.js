const defaultClient = require('../utils/supabase');

class StaffController {
  /**
   * GET /api/v1/staff — List all staff (active & non-deleted)
   */
  static async getAll(req, res) {
    try {
      const slug = req.supabase?.tenantSlug || req.restaurantSlug || 'gourmet-bistro-main';
      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'staff',
        operation: 'SELECT_ALL'
      });

      if (error) throw error;
      
      // Filter the returned columns to match original select
      const formattedData = (data || []).map(({ id, employee_code, role, display_name, is_active, last_login, created_at }) => ({
        id,
        employee_code,
        role,
        display_name,
        is_active,
        last_login,
        created_at
      }));

      return res.status(200).json({ success: true, data: formattedData });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/v1/staff — Create a new staff login
   */
  static async create(req, res) {
    try {
      const { employeeCode, password, role, displayName } = req.body;
      const bcrypt = require('bcryptjs');

      if (!employeeCode || !password || !role) {
        return res.status(400).json({ success: false, message: 'employeeCode, password, and role are required.' });
      }

      if (!['kitchen_staff', 'sales_staff', 'rider'].includes(role)) {
        return res.status(400).json({ success: false, message: 'Role must be kitchen_staff, sales_staff or rider.' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const slug = req.supabase?.tenantSlug || req.restaurantSlug || 'gourmet-bistro-main';
      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'staff',
        operation: 'INSERT',
        payload: {
          employee_code: employeeCode,
          password_hash: passwordHash,
          role,
          display_name: displayName || employeeCode
        }
      });

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ success: false, message: 'Employee code already exists for this restaurant.' });
        }
        throw error;
      }

      const formatted = data ? {
        id: data.id,
        employee_code: data.employee_code,
        role: data.role,
        display_name: data.display_name,
        is_active: data.is_active,
        created_at: data.created_at
      } : null;

      return res.status(201).json({ success: true, data: formatted });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * PATCH /api/v1/staff/:id — Update staff
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { password, displayName, isActive } = req.body;
      const bcrypt = require('bcryptjs');

      const updates = {};
      if (displayName !== undefined) updates.display_name = displayName;
      if (isActive !== undefined) updates.is_active = isActive;

      if (password) {
        const salt = await bcrypt.genSalt(10);
        updates.password_hash = await bcrypt.hash(password, salt);
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, message: 'No fields to update.' });
      }

      const slug = req.supabase?.tenantSlug || req.restaurantSlug || 'gourmet-bistro-main';
      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'staff',
        operation: 'UPDATE',
        query_id: id,
        payload: updates
      });

      if (error) throw error;

      const formatted = data ? {
        id: data.id,
        employee_code: data.employee_code,
        role: data.role,
        display_name: data.display_name,
        is_active: data.is_active,
        created_at: data.created_at
      } : null;

      return res.status(200).json({ success: true, data: formatted });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * DELETE /api/v1/staff/:id — Soft delete staff
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const slug = req.supabase?.tenantSlug || req.restaurantSlug || 'gourmet-bistro-main';
      const { error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: slug,
        table_name: 'staff',
        operation: 'DELETE',
        query_id: id
      });

      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Staff account deleted.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = StaffController;
