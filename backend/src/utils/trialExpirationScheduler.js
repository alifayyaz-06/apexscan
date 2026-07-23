const supabase = require('./supabase');
const { sendTrialExpiryNotification } = require('./mailer');

async function checkTrialExpirations() {
  try {
    console.log('[TrialScheduler] Running trial expiration check...');
    
    // 1. Fetch active trial restaurants
    const { data: restaurants, error: fetchErr } = await supabase
      .from('restaurants')
      .select('*')
      .eq('plan', 'trial')
      .is('deleted_at', null);

    if (fetchErr) {
      console.error('[TrialScheduler] Error fetching trial restaurants:', fetchErr.message);
      return;
    }

    if (!restaurants || restaurants.length === 0) {
      return;
    }

    const now = new Date();

    for (const r of restaurants) {
      if (!r.expires_at) continue;

      const exp = new Date(r.expires_at);
      const diff = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      const daysRemaining = diff > 0 ? diff : 0;

      // 2. Fetch history record to check last sent notification to avoid duplicates
      const { data: history, error: histErr } = await supabase
        .from('trial_history')
        .select('*')
        .eq('restaurant_id', r.id)
        .maybeSingle();

      if (histErr) {
        console.error(`[TrialScheduler] Error fetching history for restaurant ${r.name}:`, histErr.message);
        continue;
      }

      if (!history) continue;

      const notificationMilestones = [7, 3, 1, 0];
      const isMilestone = notificationMilestones.includes(daysRemaining);

      if (isMilestone && history.last_notification_sent !== daysRemaining) {
        console.log(`[TrialScheduler] Sending ${daysRemaining}-day milestone email to ${r.owner_email} for ${r.name}`);
        
        // Send email
        const emailSent = await sendTrialExpiryNotification(r.owner_email, r.name, daysRemaining);
        
        if (emailSent || true) { // Proceed even if email logs successfully
          // Update history log in database
          await supabase
            .from('trial_history')
            .update({ last_notification_sent: daysRemaining })
            .eq('id', history.id);
        }

        // If trial has expired (0 days remaining), change subscription status to expired
        if (daysRemaining === 0 && r.subscription_status !== 'expired') {
          console.log(`[TrialScheduler] Free trial expired for ${r.name}. Setting subscription status to expired.`);
          await supabase
            .from('restaurants')
            .update({ subscription_status: 'expired' })
            .eq('id', r.id);
        }
      }
    }
  } catch (err) {
    console.error('[TrialScheduler] Exception in scheduler task:', err.message);
  }
}

function startTrialExpirationCheck() {
  // Run on startup
  setTimeout(() => {
    checkTrialExpirations();
  }, 5000); // 5s delay to let server initialize

  // Run every 12 hours
  setInterval(() => {
    checkTrialExpirations();
  }, 12 * 60 * 60 * 1000);
}

module.exports = {
  startTrialExpirationCheck
};
