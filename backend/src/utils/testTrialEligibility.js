const assert = require('assert');

// Mock data store for unit tests
const mockTrialHistory = [
  { email: 'usedtrial@gmail.com', restaurant_name: 'Original Bistro', trial_start: new Date(), trial_end: new Date(Date.now() + 14*24*60*60*1000) }
];

const mockRestaurants = [
  { slug: 'existing-restaurant', owner_email: 'otherowner@gmail.com', is_active: true }
];

// Reusable trial eligibility validation logic (mirrors backend implementation)
function checkTrialEligibility(email, slug, name, trialHistoryStore, restaurantStore) {
  // Normalize
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-');

  if (!normalizedEmail || !normalizedSlug || !name) {
    throw new Error('All fields are required.');
  }

  // 1. Email used check in trial history
  const emailUsed = trialHistoryStore.some(h => h.email.toLowerCase().trim() === normalizedEmail);
  if (emailUsed) {
    throw new Error('This email has already used its free trial. Please purchase a subscription or contact support.');
  }

  // 2. Slug uniqueness check
  const slugExists = restaurantStore.some(r => r.slug === normalizedSlug);
  if (slugExists) {
    throw new Error('This restaurant slug is already registered. Please choose another slug.');
  }

  // 3. Email registered in active check
  const emailRegistered = restaurantStore.some(r => r.owner_email.toLowerCase().trim() === normalizedEmail);
  if (emailRegistered) {
    throw new Error('This email is already registered with another active restaurant.');
  }

  // Correct date computation checks
  const trialStart = new Date();
  const trialEnd = new Date(trialStart.getTime() + 14 * 24 * 60 * 60 * 1000);

  return {
    success: true,
    email: normalizedEmail,
    slug: normalizedSlug,
    trialStart,
    trialEnd
  };
}

// Unit Test Runner
function runTests() {
  console.log('--- Running Free Trial Eligibility Unit Tests ---');
  
  // Test Case 1: Brand new customer
  try {
    const res = checkTrialEligibility('newcustomer@gmail.com', 'my-new-bistro', 'My New Bistro', mockTrialHistory, mockRestaurants);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.email, 'newcustomer@gmail.com');
    assert.strictEqual(res.slug, 'my-new-bistro');
    
    // Check 14-day duration (approx. 14 days in milliseconds)
    const diff = res.trialEnd.getTime() - res.trialStart.getTime();
    assert.strictEqual(Math.ceil(diff / (1000 * 60 * 60 * 24)), 14);
    
    console.log('✓ Test Case 1 Passed: Brand new customer allowed and trial dates verified.');
  } catch (err) {
    console.error('✗ Test Case 1 Failed:', err.message);
    process.exit(1);
  }

  // Test Case 2: Reject already used trial (case and space normalization)
  try {
    assert.throws(() => {
      checkTrialEligibility(' USEDtrial@gmail.com ', 'new-slug', 'New Bistro', mockTrialHistory, mockRestaurants);
    }, /already used/);
    console.log('✓ Test Case 2 Passed: Casing and spacing trimmed; duplicate trial email rejected.');
  } catch (err) {
    console.error('✗ Test Case 2 Failed:', err.message);
    process.exit(1);
  }

  // Test Case 3: Reject duplicate slug
  try {
    assert.throws(() => {
      checkTrialEligibility('freshowner@gmail.com', ' EXISTING-restaurant ', 'Another Bistro', mockTrialHistory, mockRestaurants);
    }, /slug is already registered/);
    console.log('✓ Test Case 3 Passed: Duplicate slug rejected.');
  } catch (err) {
    console.error('✗ Test Case 3 Failed:', err.message);
    process.exit(1);
  }

  // Test Case 4: Reject duplicate email in active restaurants
  try {
    assert.throws(() => {
      checkTrialEligibility('otherowner@gmail.com', 'unique-slug-here', 'Unique Bistro', mockTrialHistory, mockRestaurants);
    }, /email is already registered/);
    console.log('✓ Test Case 4 Passed: Email already registered in active restaurants rejected.');
  } catch (err) {
    console.error('✗ Test Case 4 Failed:', err.message);
    process.exit(1);
  }

  console.log('------------------------------------------------');
  console.log('✓ All 4 Unit Tests Passed Successfully!');
  console.log('------------------------------------------------');
}

runTests();
