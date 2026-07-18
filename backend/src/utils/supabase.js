const { createClient } = require('@supabase/supabase-js');
const envs = require('../config/envs');

// Default client points to public schema
const defaultClient = createClient(envs.supabaseUrl, envs.supabaseKey);

// In-memory client cache by tenant schema
const clientCache = {};

function getTenantClient(tenantSlug) {
  if (!tenantSlug) return defaultClient;

  // Format schema name to match database conventions (dashes to underscores)
  const schemaName = `tenant_${tenantSlug.replace(/-/g, '_').toLowerCase()}`;

  if (clientCache[schemaName]) {
    return clientCache[schemaName];
  }

  // Create client instance bound to private tenant schema
  const tenantClient = createClient(envs.supabaseUrl, envs.supabaseKey, {
    db: { schema: schemaName }
  });

  // Attach the original tenant slug to the client instance
  tenantClient.tenantSlug = tenantSlug;

  clientCache[schemaName] = tenantClient;
  return tenantClient;
}

// Attach helpers directly to the defaultClient object to maintain prototype methods
defaultClient.defaultClient = defaultClient;
defaultClient.getTenantClient = getTenantClient;

module.exports = defaultClient;
