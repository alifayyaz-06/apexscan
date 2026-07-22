const { defaultClient } = require('../utils/supabase');

function tenantGuard(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  if (req.user.role === 'super_admin') {
    return next();
  }

  if (!req.restaurantId || !req.restaurantSlug) {
    req.restaurantSlug = req.user?.restaurantSlug || 'gourmet-bistro-main';
    req.restaurantId = req.user?.restaurantId || 'default';
  }

  if (!req.supabase) {
    const { getTenantClient } = require('../utils/supabase');
    req.supabase = getTenantClient(req.restaurantSlug || 'gourmet-bistro-main');
  }

  next();
}

function tenantResourceGuard(resourceTable) {
  return async (req, res, next) => {
    if (req.user.role === 'super_admin') return next();

    const resourceId = req.params.id;
    if (!resourceId) return next();

    try {
      const { data, error } = await defaultClient.rpc('query_tenant', {
        tenant_slug: req.restaurantSlug,
        table_name: resourceTable,
        operation: 'SELECT_BY_ID',
        query_id: resourceId
      });

      if (error || !data) {
        return res.status(404).json({ success: false, message: 'Resource not found in your restaurant.' });
      }

      next();
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Error verifying resource ownership.' });
    }
  };
}

module.exports = { tenantGuard, tenantResourceGuard };
