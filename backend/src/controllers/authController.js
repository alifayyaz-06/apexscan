const { defaultClient, getTenantClient } = require('../utils/supabase');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const envs = require('../config/envs');

const JWT_SECRET = envs.jwtSecret;
const JWT_REFRESH_SECRET = envs.jwtRefreshSecret;
const SUPER_ADMIN_EMAIL = envs.superAdminEmail;

// Map direct supabase usage to defaultClient (public schema)
const supabase = defaultClient;

class AuthController {
  /**
   * POST /api/v1/auth/admin/login
   */
  static async adminLogin(req, res) {
    try {
      let { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
      }

      email = email.toLowerCase().trim();
      const isSuper = email === SUPER_ADMIN_EMAIL.toLowerCase();

      // Look up restaurant (non-deleted)
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('*')
        .ilike('owner_email', email)
        .is('deleted_at', null)
        .maybeSingle();

      // Check if user exists in Supabase Auth
      let authUser = null;
      try {
        const { createClient } = require('@supabase/supabase-js');
        const adminClient = createClient(envs.supabaseUrl, envs.supabaseServiceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        });
        const { data: { users }, error: listErr } = await adminClient.auth.admin.listUsers();
        if (!listErr && users) {
          authUser = users.find(u => u.email?.toLowerCase() === email);
        }
      } catch (err) {
        console.error('[adminLogin] Auth account check failed:', err.message);
      }

      if (restaurant && !authUser && !isSuper) {
        const otpStore = require('../utils/otpStore');
        const { sendOtp } = require('../utils/mailer');

        const otp = otpStore.generate();
        otpStore.set(email, otp);

        console.log(`[adminLogin] First-time setup. Sending OTP ${otp} to ${email}`);
        await sendOtp(email, otp);

        return res.status(200).json({
          success: false,
          code: 'FIRST_TIME_SETUP',
          message: 'First-time login setup required. A verification code has been sent to your Gmail to set your password.'
        });
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return res.status(401).json({ success: false, message: error.message });

      if (!restaurant && !isSuper) {
        return res.status(403).json({ success: false, message: 'No active restaurant registered for this email.' });
      }

      if (restaurant && !restaurant.is_active && !isSuper) {
        return res.status(403).json({ success: false, message: 'Your restaurant account has been deactivated.' });
      }

      if (restaurant && !isSuper && restaurant.subscription_status !== 'unlimited') {
        const now = new Date();
        const expiresAt = restaurant.expires_at ? new Date(restaurant.expires_at) : null;
        if ((expiresAt && now > expiresAt) || restaurant.subscription_status === 'expired') {
          if (restaurant.subscription_status !== 'expired') {
            await supabase.from('restaurants').update({ subscription_status: 'expired' }).eq('id', restaurant.id);
          }
          return res.status(403).json({ success: false, message: 'Your restaurant subscription has expired. Please contact the platform administrator.', code: 'SUBSCRIPTION_EXPIRED' });
        }
      }

      // Auto-provision schema on login if it doesn't exist (failsafe migration check)
      if (restaurant && restaurant.slug) {
        const { error: schemaErr } = await supabase.rpc('create_tenant_schema', {
          tenant_slug: restaurant.slug
        });
        if (schemaErr) {
          console.warn('Failsafe schema check warn:', schemaErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          token: data.session.access_token,
          refreshToken: data.session.refresh_token,
          user: {
            email: data.user.email,
            role: isSuper ? 'super_admin' : 'admin',
            restaurantId: restaurant ? restaurant.id : null,
            restaurantName: restaurant ? restaurant.name : null,
            restaurantSlug: restaurant ? restaurant.slug : null,
            restaurantLogo: restaurant ? restaurant.logo_url : null
          }
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/v1/auth/admin/signup
   * Invite redemption password setup (validates allowed email)
   */
  static async adminSignup(req, res) {
    try {
      let { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
      }

      email = email.toLowerCase().trim();

      // Check if email exists in restaurants and not deleted
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('*')
        .ilike('owner_email', email)
        .is('deleted_at', null)
        .maybeSingle();

      if (!restaurant) {
        return res.status(403).json({ success: false, message: 'This email is not authorized or invited yet.' });
      }

      // Create Supabase Auth account
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return res.status(400).json({ success: false, message: error.message });

      // Automatically provision private schema and seed default tables/menu
      const { error: schemaErr } = await supabase.rpc('create_tenant_schema', {
        tenant_slug: restaurant.slug
      });
      if (schemaErr) {
        console.error('Error provisioning tenant schema on signup:', schemaErr.message);
      }

      return res.status(201).json({
        success: true,
        message: 'Account created successfully. You can now sign in.',
        data: {
          user: {
            email: data.user.email,
            restaurantId: restaurant.id,
            restaurantName: restaurant.name
          }
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/v1/auth/staff/login
   * Login using employeeCode, password and restaurantSlug
   */
  static async staffLogin(req, res) {
    try {
      const { employeeCode, password, restaurantSlug, adminEmail } = req.body;
      if (!employeeCode || !password) {
        return res.status(400).json({ success: false, message: 'Employee code and password are required.' });
      }

      if (!restaurantSlug && !adminEmail) {
        return res.status(400).json({ 
          success: false, 
          message: 'Restaurant context (Admin Email or Restaurant Slug) is required.' 
        });
      }

      // Resolve restaurant details from public schema
      let restaurant = null;
      if (adminEmail) {
        const { data } = await supabase
          .from('restaurants')
          .select('*')
          .ilike('owner_email', adminEmail)
          .is('deleted_at', null)
          .maybeSingle();
        restaurant = data;
      } else {
        const { data } = await supabase
          .from('restaurants')
          .select('*')
          .eq('slug', restaurantSlug)
          .is('deleted_at', null)
          .maybeSingle();
        restaurant = data;
      }

      if (!restaurant || !restaurant.is_active || restaurant.deleted_at) {
        return res.status(403).json({ success: false, message: 'Parent restaurant not found, inactive, or suspended.' });
      }

      if (restaurant.subscription_status !== 'unlimited') {
        const now = new Date();
        const expiresAt = restaurant.expires_at ? new Date(restaurant.expires_at) : null;
        if ((expiresAt && now > expiresAt) || restaurant.subscription_status === 'expired') {
          if (restaurant.subscription_status !== 'expired') {
            await defaultClient.from('restaurants').update({ subscription_status: 'expired' }).eq('id', restaurant.id);
          }
          return res.status(403).json({ success: false, message: 'Restaurant subscription has expired. Please contact the platform administrator.', code: 'SUBSCRIPTION_EXPIRED' });
        }
      }

      // Find staff member inside their private restaurant schema using the resolved restaurant slug
      const { data: staffMembers, error: staffErr } = await defaultClient.rpc('query_tenant', {
        tenant_slug: restaurant.slug,
        table_name: 'staff',
        operation: 'SELECT_BY_ID',
        query_id: employeeCode
      });

      if (staffErr) throw staffErr;

      const staffMember = staffMembers && staffMembers.length > 0 ? staffMembers[0] : (staffMembers && typeof staffMembers === 'object' && !Array.isArray(staffMembers) ? staffMembers : null);
      if (!staffMember) {
        return res.status(401).json({ success: false, message: 'Invalid employee code or password.' });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, staffMember.password_hash);
      if (!validPassword) {
        return res.status(401).json({ success: false, message: 'Invalid employee code or password.' });
      }

      if (!staffMember.is_active) {
        return res.status(403).json({ success: false, message: 'Your staff account has been deactivated.' });
      }

      // Update last_login in private schema
      await defaultClient.rpc('query_tenant', {
        tenant_slug: restaurant.slug,
        table_name: 'staff',
        operation: 'UPDATE',
        query_id: staffMember.id,
        payload: { last_login: new Date().toISOString() }
      });

      // Sign access token (short-lived, 7 days)
      const tokenPayload = {
        staffId: staffMember.id,
        restaurantId: restaurant.id,
        restaurantSlug: restaurant.slug,
        role: staffMember.role,
        employeeCode: staffMember.employee_code,
        displayName: staffMember.display_name
      };
      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

      // Sign refresh token (longer-lived, 30 days)
      const refreshToken = jwt.sign(
        { staffId: staffMember.id, restaurantId: restaurant.id, type: 'refresh' },
        envs.jwtRefreshSecret,
        { expiresIn: '30d' }
      );

      return res.status(200).json({
        success: true,
        data: {
          token,
          refreshToken,
          user: {
            id: staffMember.id,
            employeeCode: staffMember.employee_code,
            displayName: staffMember.display_name,
            role: staffMember.role,
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            restaurantSlug: restaurant.slug,
            restaurantLogo: restaurant.logo_url
          }
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/v1/auth/staff/refresh
   */
  static async staffRefresh(req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token is required.' });
      }

      let decoded;
      try {
        decoded = jwt.verify(refreshToken, envs.jwtRefreshSecret);
      } catch (e) {
        return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
      }

      if (decoded.type !== 'refresh') {
        return res.status(401).json({ success: false, message: 'Invalid token type.' });
      }

      const { data: restaurant } = await defaultClient
        .from('restaurants')
        .select('id, name, slug, is_active, logo_url')
        .eq('id', decoded.restaurantId)
        .maybeSingle();

      if (!restaurant || !restaurant.is_active) {
        return res.status(403).json({ success: false, message: 'Restaurant account deactivated.' });
      }

      const { data: staffMember } = await defaultClient.rpc('query_tenant', {
        tenant_slug: restaurant.slug,
        table_name: 'staff',
        operation: 'SELECT_BY_ID',
        query_id: decoded.staffId
      });

      const staff = Array.isArray(staffMember) ? staffMember[0] : staffMember;
      if (!staff || !staff.is_active || staff.deleted_at) {
        return res.status(401).json({ success: false, message: 'Staff account no longer active.' });
      }

      const newToken = jwt.sign(
        {
          staffId: staff.id,
          restaurantId: restaurant.id,
          role: staff.role,
          employeeCode: staff.employee_code,
          displayName: staff.display_name
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const newRefreshToken = jwt.sign(
        { staffId: staff.id, restaurantId: restaurant.id, type: 'refresh' },
        envs.jwtRefreshSecret,
        { expiresIn: '30d' }
      );

      return res.status(200).json({
        success: true,
        data: { token: newToken, refreshToken: newRefreshToken }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/v1/auth/admin/forgot-password
   * Sends a 6-digit OTP via Gmail SMTP. Only works for emails that belong
   * to an active restaurant in the super admin's restaurant list.
   */
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required.' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const isSuperAdmin = normalizedEmail === envs.superAdminEmail.toLowerCase().trim();

      console.log(`[forgotPassword] Request for: ${normalizedEmail}, isSuperAdmin: ${isSuperAdmin}`);

      // Only allow reset for emails that own an active, non-deleted restaurant
      const { data: restaurant, error: dbErr } = await supabase
        .from('restaurants')
        .select('id, is_active')
        .ilike('owner_email', normalizedEmail)
        .is('deleted_at', null)
        .maybeSingle();

      console.log(`[forgotPassword] DB result:`, { restaurant, dbErr: dbErr?.message });

      if (dbErr || !restaurant || !restaurant.is_active || isSuperAdmin) {
        console.log(`[forgotPassword] Blocked: dbErr=${!!dbErr}, noRestaurant=${!restaurant}, inactive=${restaurant && !restaurant.is_active}, superAdmin=${isSuperAdmin}`);
        return res.status(200).json({
          success: true,
          message: 'If this email is registered, a password reset code has been sent.'
        });
      }

      const otpStore = require('../utils/otpStore');
      const { sendOtp } = require('../utils/mailer');

      const otp = otpStore.generate();
      otpStore.set(normalizedEmail, otp);

      console.log(`[forgotPassword] Sending OTP ${otp} to ${normalizedEmail}`);
      await sendOtp(normalizedEmail, otp);
      console.log(`[forgotPassword] Email sent successfully`);

      return res.status(200).json({
        success: true,
        message: 'If this email is registered, a password reset code has been sent.'
      });
    } catch (err) {
      console.error('[forgotPassword] Error:', err.message, err.stack);
      return res.status(500).json({ success: false, message: 'Failed to send reset code. Please try again.' });
    }
  }

  /**
   * POST /api/v1/auth/admin/reset-password-otp
   * Validates the 6-digit OTP and resets the password via Supabase admin API.
   */
  static async resetPasswordOtp(req, res) {
    try {
      const { email, otp, password } = req.body;
      if (!email || !otp || !password) {
        return res.status(400).json({ success: false, message: 'Email, verification code, and new password are required.' });
      }
      if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const otpStore = require('../utils/otpStore');
      const result = otpStore.verify(normalizedEmail, otp.trim());

      if (!result.valid) {
        return res.status(400).json({ success: false, message: result.reason });
      }

      // OTP verified — use Supabase Admin API to update password
      // This requires the service role key
      const { createClient } = require('@supabase/supabase-js');
      const adminClient = createClient(envs.supabaseUrl, envs.supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      // Look up user by email
      const { data: { users }, error: listErr } = await adminClient.auth.admin.listUsers();
      if (listErr) {
        console.error('[resetPasswordOtp] listUsers error:', listErr.message);
        return res.status(500).json({ success: false, message: 'Failed to look up user.' });
      }

      const authUser = users.find(u => u.email?.toLowerCase() === normalizedEmail);
      let authUserId;
      let isNewUser = false;

      if (!authUser) {
        const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
          email: normalizedEmail,
          password: password,
          email_confirm: true
        });
        if (createErr) {
          console.error('[resetPasswordOtp] createUser error:', createErr.message);
          return res.status(400).json({ success: false, message: createErr.message || 'Failed to create user account.' });
        }
        authUserId = newUser.user.id;
        isNewUser = true;
        console.log(`[resetPasswordOtp] Created new auth user for ${normalizedEmail} with ID ${authUserId}`);
      } else {
        authUserId = authUser.id;
        const { error: updateErr } = await adminClient.auth.admin.updateUserById(authUserId, { password });
        if (updateErr) {
          console.error('[resetPasswordOtp] updateUser error:', updateErr.message);
          return res.status(400).json({ success: false, message: updateErr.message || 'Failed to update password.' });
        }
      }

      // Provision schema on first-time login/setup
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('slug')
        .ilike('owner_email', normalizedEmail)
        .is('deleted_at', null)
        .maybeSingle();

      if (restaurant && restaurant.slug) {
        console.log(`[resetPasswordOtp] Provisioning database schema for ${restaurant.slug}`);
        const { error: schemaErr } = await supabase.rpc('create_tenant_schema', {
          tenant_slug: restaurant.slug
        });
        if (schemaErr) {
          console.error('[resetPasswordOtp] Error provisioning tenant schema:', schemaErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: isNewUser 
          ? 'Account activated and password set successfully! You can now log in.' 
          : 'Password updated successfully. You can now log in.'
      });
    } catch (err) {
      console.error('[resetPasswordOtp] Exception:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/v1/auth/me
   */
  static async getMe(req, res) {
    try {
      return res.status(200).json({
        success: true,
        data: {
          role: req.user.role,
          email: req.user.email || null,
          displayName: req.user.displayName,
          restaurantId: req.user.restaurantId || null,
          restaurantName: req.user.restaurant ? req.user.restaurant.name : null,
          restaurantSlug: req.user.restaurant ? req.user.restaurant.slug : null,
          restaurantLogo: req.user.restaurant ? req.user.restaurant.logo_url : null
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = AuthController;
