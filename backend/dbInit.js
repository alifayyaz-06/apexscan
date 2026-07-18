const { defaultClient } = require('./src/utils/supabase');
const envs = require('./src/config/envs');

const supabase = defaultClient;

async function dbInit() {
  try {
    console.log('Checking database connection and running auto-migrations v5...');

    // 1. Check if restaurants table has a record for the super admin
    const SUPER_EMAIL = envs.superAdminEmail;
    const { data: superRest, error: superRestError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_email', SUPER_EMAIL);

    if (superRestError) {
      console.error('Database connection error. Ensure you have run the combined SQL migration script in your Supabase SQL Editor.');
      return;
    }

    let defaultRestaurantSlug = 'gourmet-bistro-main';

    if (!superRest || superRest.length === 0) {
      console.log(`Auto-seeding default restaurant for super admin: ${SUPER_EMAIL}`);
      const { data: newRest, error: insertError } = await supabase
        .from('restaurants')
        .insert([{
          name: 'Gourmet Bistro Main',
          slug: defaultRestaurantSlug,
          owner_email: SUPER_EMAIL,
          is_active: true,
          plan: 'premium',
          subscription_status: 'active'
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting default restaurant:', insertError.message);
      } else {
        console.log('Default restaurant seeded successfully!');
      }
    } else {
      const rest = superRest[0];
      if (!rest.slug) {
        console.log('Updating slug for default restaurant...');
        await supabase
          .from('restaurants')
          .update({ slug: defaultRestaurantSlug })
          .eq('id', rest.id);
      } else {
        defaultRestaurantSlug = rest.slug;
      }
    }

    // 2. Provision schemas for ALL registered active restaurants (Auto-Repair)
    console.log('Fetching all registered restaurants to ensure database schemas are provisioned...');
    const { data: allRest, error: allRestError } = await supabase
      .from('restaurants')
      .select('name, slug')
      .is('deleted_at', null);

    if (allRestError) {
      console.error('Error fetching restaurants in dbInit:', allRestError.message);
    } else if (allRest) {
      for (const r of allRest) {
        if (r.slug) {
          console.log(`Ensuring schema-per-tenant is provisioned for: ${r.slug} (${r.name})`);
          const { error: schemaErr } = await supabase.rpc('create_tenant_schema', {
            tenant_slug: r.slug
          });
          if (schemaErr) {
            console.error(`Error provisioning schema for ${r.slug}:`, schemaErr.message);
          }
        }
      }
      console.log('All schemas verified and provisioned.');
    }

    console.log('Database v5 initialization completed.');
  } catch (err) {
    console.error('Database v5 initialization exception:', err.message);
  }
}

module.exports = dbInit;
