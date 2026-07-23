const assert = require('assert');

// Mock data store for unit tests
const mockTrialHistory = [
  { email: 'usedtrial@gmail.com', restaurant_name: 'Original Bistro', trial_start: new Date(), trial_end: new Date(Date.now() + 14*24*60*60*1000) }
];

const mockRestaurants = [
  { slug: 'invited-restaurant', owner_email: 'invitedowner@gmail.com', name: 'Invited Restaurant', is_active: true },
  { slug: 'used-restaurant', owner_email: 'usedtrial@gmail.com', name: 'Used Trial Restaurant', is_active: true }
];

// Reusable trial eligibility validation logic (mirrors backend implementation)
function checkTrialEligibility(email, password, trialHistoryStore, restaurantStore) {
  // Normalize
  const normalizedEmail = email.toLowerCase().trim();

  if (!normalizedEmail || !password) {
    throw new Error('Email and password are required.');
  }

  // 1. Fetch pre-created/invited restaurant from the Super Admin list
  const restaurant = restaurantStore.find(r => r.owner_email.toLowerCase().trim() === normalizedEmail);
  if (!restaurant) {
    throw new Error('This email is not authorized or invited by the Super Admin yet. Please contact support.');
  }

  // 2. Ensure they haven't already registered/onboarded this email in trial history
  const emailUsed = trialHistoryStore.some(h => h.email.toLowerCase().trim() === normalizedEmail);
  if (emailUsed) {
    throw new Error('This email has already claimed its free trial. Please log in or contact support.');
  }

  const trialStart = new Date();
  const trialEnd = new Date(trialStart.getTime() + 14 * 24 * 60 * 60 * 1000);

  return {
    success: true,
    email: normalizedEmail,
    slug: restaurant.slug,
    name: restaurant.name,
    trialStart,
    trialEnd
  };
}

// Unit Test Runner
function runTests() {
  console.log('--- Running Free Trial Eligibility Unit Tests ---');
  
  // Test Case 1: Pre-invited customer allowed
  try {
    const res = checkTrialEligibility('invitedowner@gmail.com', 'securepass123', mockTrialHistory, mockRestaurants);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.email, 'invitedowner@gmail.com');
    assert.strictEqual(res.slug, 'invited-restaurant');
    
    // Check 14-day duration (approx. 14 days in milliseconds)
    const diff = res.trialEnd.getTime() - res.trialStart.getTime();
    assert.strictEqual(Math.ceil(diff / (1000 * 60 * 60 * 24)), 14);
    
    console.log('✓ Test Case 1 Passed: Pre-invited customer allowed and trial dates verified.');
  } catch (err) {
    console.error('✗ Test Case 1 Failed:', err.message);
    process.exit(1);
  }

  // Test Case 2: Reject uninvited arbitrary email
  try {
    assert.throws(() => {
      checkTrialEligibility('uninvited@gmail.com', 'somepass123', mockTrialHistory, mockRestaurants);
    }, /not authorized or invited/);
    console.log('✓ Test Case 2 Passed: Uninvited email rejected.');
  } catch (err) {
    console.error('✗ Test Case 2 Failed:', err.message);
    process.exit(1);
  }

  // Test Case 3: Reject already used trial (case and space normalization)
  try {
    assert.throws(() => {
      checkTrialEligibility(' USEDtrial@gmail.com ', 'somepass123', mockTrialHistory, mockRestaurants);
    }, /already claimed/);
    console.log('✓ Test Case 3 Passed: Duplicate trial email rejected.');
  } catch (err) {
    console.error('✗ Test Case 3 Failed:', err.message);
    process.exit(1);
  }

  console.log('------------------------------------------------');
  console.log('✓ All 3 Unit Tests Passed Successfully!');
  console.log('------------------------------------------------');
}

runTests();
