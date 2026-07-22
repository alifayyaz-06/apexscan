const jwt = require('jsonwebtoken');
const { defaultClient, getTenantClient } = require('../utils/supabase');
const envs = require('../config/envs');

const JWT_SECRET = envs.jwtSecret;
const SUPER_ADMIN_EMAIL = envs.superAdminEmail;

/**
 * Unified Authentication Middleware
 * Resolves JWT and attaches tenant-scoped Supabase client (req.supabase)
 */
async function authenticate(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'No authentication token provided.' });
    }

    // 1. Try Custom Staff JWT first
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.staffId) {
        // Staff details exist in their private restaurant schema!
        let restaurant = null;
        if (decoded.restaurantId) {
          const { data } = await defaultClient
            .from('restaurants')
            .select('id, name, slug, logo_url, is_active, subscription_status, expires_at')
            .eq('id', decoded.restaurantId)
            .maybeSingle();
          restaurant = data;
        }

        if (!restaurant && decoded.restaurantSlug) {
          const { data } = await defaultClient
            .from('restaurants')
            .select('id, name, slug, logo_url, is_active, subscription_status, expires_at')
            .eq('slug', decoded.restaurantSlug)
            .maybeSingle();
          restaurant = data;
        }

        if (!restaurant) {
          const { data } = await defaultClient
            .from('restaurants')
            .select('id, name, slug, logo_url, is_active, subscription_status, expires_at')
            .is('deleted_at', null)
            .limit(1)
            .maybeSingle();
          restaurant = data;
        }

        if (!restaurant || !restaurant.is_active) {
          return res.status(403).json({ success: false, message: 'Restaurant account deactivated or not found.' });
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

        // Get tenant client for staff schema
        const tenantClient = getTenantClient(restaurant.slug);

        // Fetch staff record from their private tenant schema
        const { data: staffMember } = await defaultClient.rpc('query_tenant', {
          tenant_slug: restaurant.slug,
          table_name: 'staff',
          operation: 'SELECT_BY_ID',
          query_id: decoded.staffId
        });

        if (!staffMember || !staffMember.is_active || staffMember.deleted_at) {
          return res.status(401).json({ success: false, message: 'Staff credentials invalid or shift ended.' });
        }

        req.user = {
          id: staffMember.id,
          restaurantId: restaurant.id,
          restaurantSlug: restaurant.slug,
          role: staffMember.role,
          displayName: staffMember.display_name,
          restaurant
        };
        req.restaurantId = restaurant.id;
        req.restaurantSlug = restaurant.slug;
        req.supabase = tenantClient; // Tenant scoped client!
        return next();
      }
    } catch (e) {
      // Not a valid staff token, fallback to Supabase token
    }

    // 2. Try Supabase Auth (Restaurant Admins & Super Admins)
    const { data: { user }, error: authError } = await defaultClient.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ success: false, message: 'Session expired or token invalid.' });
    }

    // 2a. Check if Super Admin (Platform Owner)
    if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      req.user = {
        id: user.id,
        role: 'super_admin',
        displayName: 'Platform Owner',
        email: user.email
      };
      req.supabase = defaultClient; // Super Admin uses public schema
      return next();
    }

    // 2b. Check if Restaurant Admin (resolves email from public restaurants table)
    const { data: restaurant } = await defaultClient
      .from('restaurants')
      .select('*')
      .ilike('owner_email', user.email)
      .is('deleted_at', null)
      .maybeSingle();

    if (!restaurant) {
      return res.status(403).json({ success: false, message: 'No active restaurant associated with this email.' });
    }

    if (!restaurant.is_active) {
      return res.status(403).json({ success: false, message: 'Restaurant account has been deactivated.' });
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

    req.user = {
      id: user.id,
      restaurantId: restaurant.id,
      restaurantSlug: restaurant.slug,
      role: 'admin',
      displayName: restaurant.name,
      email: user.email,
      restaurant
    };
    req.restaurantId = restaurant.id;
    req.restaurantSlug = restaurant.slug;
    req.supabase = getTenantClient(restaurant.slug); // Tenant scoped client!
    return next();

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Optional Authentication Middleware
 * Attempts to authenticate bearer token but does not fail if missing/invalid
 */
async function optionalAuthenticate(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) return next();

    // 1. Try Custom Staff JWT
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.staffId) {
        const { data: restaurant } = await defaultClient
          .from('restaurants')
          .select('id, name, slug, is_active, subscription_status, expires_at')
          .eq('id', decoded.restaurantId)
          .maybeSingle();

        if (restaurant && restaurant.is_active) {
          const tenantClient = getTenantClient(restaurant.slug);
          const { data: staffMembers } = await defaultClient.rpc('query_tenant', {
            tenant_slug: restaurant.slug,
            table_name: 'staff',
            operation: 'SELECT_BY_ID',
            query_id: decoded.staffId
          });
          const staffMember = staffMembers && staffMembers.length > 0 ? staffMembers[0] : (staffMembers && typeof staffMembers === 'object' && !Array.isArray(staffMembers) ? staffMembers : null);

          if (staffMember && staffMember.is_active && !staffMember.deleted_at) {
            req.user = {
              id: staffMember.id,
              restaurantId: restaurant.id,
              restaurantSlug: restaurant.slug,
              role: staffMember.role,
              displayName: staffMember.display_name,
              restaurant
            };
            req.restaurantId = restaurant.id;
            req.restaurantSlug = restaurant.slug;
            req.supabase = tenantClient;
          }
        }
        return next();
      }
    } catch (e) {}

    // 2. Try Supabase Auth (Restaurant Admins & Super Admins)
    const { data: { user }, error: authError } = await defaultClient.auth.getUser(token);
    if (!authError && user) {
      if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        req.user = {
          id: user.id,
          role: 'super_admin',
          displayName: 'Platform Owner',
          email: user.email
        };
        req.supabase = defaultClient;
        return next();
      }

      const { data: restaurant } = await defaultClient
        .from('restaurants')
        .select('*')
        .ilike('owner_email', user.email)
        .is('deleted_at', null)
        .maybeSingle();

      if (restaurant && restaurant.is_active) {
        req.user = {
          id: user.id,
          restaurantId: restaurant.id,
          restaurantSlug: restaurant.slug,
          role: 'admin',
          displayName: restaurant.name,
          email: user.email,
          restaurant
        };
        req.restaurantId = restaurant.id;
        req.restaurantSlug = restaurant.slug;
        req.supabase = getTenantClient(restaurant.slug);
      }
    }
  } catch (err) {
    // Ignore error and proceed anonymously
  }
  next();
}

/**
 * Role-Based Authorization Middleware Generator
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1];
}

module.exports = { authenticate, optionalAuthenticate, authorize };
