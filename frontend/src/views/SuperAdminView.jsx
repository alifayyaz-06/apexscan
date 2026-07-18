import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../utils/config';

const BACKEND_URL = API_URL;

const DURATION_PRESETS = [7, 15, 30, 60, 90, 180];

function getSubscriptionBadge(r) {
  if (!r.is_active) return { label: 'Disabled', cls: 'bg-zinc-100 text-zinc-500 border-zinc-200' };
  if (r.subscription_status === 'unlimited') return { label: 'Unlimited', cls: 'bg-blue-50 text-blue-600 border-blue-200' };
  if (r.subscription_status === 'expired') return { label: 'Expired', cls: 'bg-red-50 text-red-600 border-red-200' };
  const now = new Date();
  const exp = r.expires_at ? new Date(r.expires_at) : null;
  if (exp && now > exp) return { label: 'Expired', cls: 'bg-red-50 text-red-600 border-red-200' };
  return { label: 'Active', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
}

function getRemainingDays(r) {
  if (r.subscription_status === 'unlimited') return 'Unlimited';
  if (r.subscription_status === 'expired') return 'Expired';
  if (!r.expires_at) return '—';
  const now = new Date();
  const exp = new Date(r.expires_at);
  const diff = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return 'Expired';
  return `${diff} days`;
}

export default function SuperAdminView() {
  const { user, logout, authHeaders, handleGoogleCallback } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Create form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [subscriptionType, setSubscriptionType] = useState('limited');
  const [subscriptionDays, setSubscriptionDays] = useState(30);

  // Edit/Renew modal state
  const [editRestaurant, setEditRestaurant] = useState(null);
  const [editSubType, setEditSubType] = useState('limited');
  const [editSubDays, setEditSubDays] = useState(30);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    const processCallback = async () => {
      const isOAuth = window.location.hash.includes('access_token') || window.location.search.includes('code');
      if (isOAuth) {
        const success = await handleGoogleCallback();
        if (success) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
      loadRestaurants();
    };
    processCallback();
  }, []);

  const loadRestaurants = async () => {
    try {
      const headers = authHeaders();
      const res = await fetch(`${BACKEND_URL}/api/v1/super/restaurants`, { headers });
      if (res.ok) {
        const result = await res.json();
        setRestaurants(result.data);
      } else {
        const errResult = await res.json();
        setError(errResult.message || 'Failed to fetch restaurants.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection to backend failed.');
    }
    setLoading(false);
  };

  const handleAddRestaurant = async (e) => {
    e.preventDefault();
    setError('');

    const formattedSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    if (!formattedSlug) {
      setError('Please provide a valid slug.');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/super/restaurants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          name,
          slug: formattedSlug,
          ownerEmail,
          subscriptionType,
          subscriptionDays: subscriptionType === 'limited' ? subscriptionDays : undefined
        })
      });
      const result = await res.json();
      if (result.success) {
        setRestaurants(prev => [result.data, ...prev]);
        setName('');
        setSlug('');
        setOwnerEmail('');
        setSubscriptionType('limited');
        setSubscriptionDays(30);
        setShowModal(false);
      } else {
        setError(result.message || 'Failed to create.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error during creation.');
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/super/restaurants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      const result = await res.json();
      if (result.success) {
        setRestaurants(prev => prev.map(r => r.id === id ? { ...r, is_active: !currentStatus } : r));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRestaurant = async (id) => {
    if (!confirm('Are you sure you want to delete this restaurant? This action cannot be undone.')) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/super/restaurants/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (res.ok) {
        setRestaurants(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (r) => {
    setEditRestaurant(r);
    setEditSubType(r.subscription_status === 'unlimited' ? 'unlimited' : 'limited');
    setEditSubDays(r.subscription_days || 30);
  };

  const handleRenew = async () => {
    if (!editRestaurant) return;
    setEditLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/super/restaurants/${editRestaurant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          subscriptionType: editSubType,
          subscriptionDays: editSubType === 'limited' ? editSubDays : undefined
        })
      });
      const result = await res.json();
      if (result.success) {
        setRestaurants(prev => prev.map(r => r.id === editRestaurant.id ? result.data : r));
        setEditRestaurant(null);
      } else {
        setError(result.message || 'Failed to update subscription.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error during update.');
    }
    setEditLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F9F9F9] text-[#2B2D42]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔑</span>
          <h1 className="text-xl font-playwrite tracking-tight text-[#2B2D42]">
            Super<span className="text-[#E63946]">Admin</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 font-medium">{user?.email || 'Logged in'}</span>
          <button onClick={logout} className="text-xs text-red-500 hover:text-red-700 font-bold transition-colors">
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#2B2D42]">Restaurants</h2>
            <p className="text-slate-400 text-sm mt-1">Manage and provision SaaS restaurant client instances</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#E63946] hover:bg-[#FF6B35] text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md shadow-[#E63946]/20 transition-all"
          >
            + Register Restaurant
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading restaurants...</div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.035)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-500">
                <thead className="text-xs uppercase bg-slate-50 border-b border-slate-200 text-slate-400">
                  <tr>
                    <th className="px-4 py-4">Name</th>
                    <th className="px-4 py-4">Owner</th>
                    <th className="px-4 py-4">Subscription</th>
                    <th className="px-4 py-4">Activation</th>
                    <th className="px-4 py-4">Expiry</th>
                    <th className="px-4 py-4">Remaining</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {restaurants.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-10 text-center text-slate-400 italic">No restaurants registered.</td>
                    </tr>
                  ) : (
                    restaurants.map(r => {
                      const badge = getSubscriptionBadge(r);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-4">
                            <div className="font-bold text-[#2B2D42]">{r.name}</div>
                            <div className="font-mono text-xs text-[#E63946]">/{r.slug}</div>
                          </td>
                          <td className="px-4 py-4 text-xs">{r.owner_email}</td>
                          <td className="px-4 py-4 text-xs font-medium">
                            {r.subscription_status === 'unlimited' ? 'Unlimited' : `${r.subscription_days || '—'} days`}
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-400">
                            {r.activated_at ? new Date(r.activated_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-400">
                            {r.subscription_status === 'unlimited' ? 'Never' : (r.expires_at ? new Date(r.expires_at).toLocaleDateString() : '—')}
                          </td>
                          <td className="px-4 py-4 text-xs font-semibold">
                            {getRemainingDays(r)}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleToggleActive(r.id, r.is_active)}
                                className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
                                  r.is_active
                                    ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                                    : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                }`}
                              >
                                {r.is_active ? 'Disable' : 'Enable'}
                              </button>
                              <button
                                onClick={() => openEditModal(r)}
                                className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                              >
                                Renew
                              </button>
                              <button
                                onClick={() => handleDeleteRestaurant(r.id)}
                                className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Create Restaurant Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-5">
              <h3 className="text-lg font-bold text-[#2B2D42]">Register Restaurant</h3>
              <button onClick={() => setShowModal(false)} className="text-xl text-slate-400 hover:text-[#2B2D42]">✕</button>
            </div>
            <form onSubmit={handleAddRestaurant} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Restaurant Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gourmet Bistro Downtown"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">URL Slug</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. gourmet-bistro"
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Owner Email (Allowed Login)</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. owner@example.com"
                  value={ownerEmail}
                  onChange={e => setOwnerEmail(e.target.value)}
                  className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none transition-colors"
                />
              </div>

              {/* Subscription Type */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Subscription Type</label>
                <div className="flex gap-3">
                  <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold cursor-pointer transition-all ${
                    subscriptionType === 'unlimited' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}>
                    <input type="radio" name="subType" value="unlimited" checked={subscriptionType === 'unlimited'} onChange={() => setSubscriptionType('unlimited')} className="sr-only" />
                    Unlimited
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold cursor-pointer transition-all ${
                    subscriptionType === 'limited' ? 'border-[#E63946] bg-red-50 text-[#E63946]' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}>
                    <input type="radio" name="subType" value="limited" checked={subscriptionType === 'limited'} onChange={() => setSubscriptionType('limited')} className="sr-only" />
                    Limited Duration
                  </label>
                </div>
              </div>

              {/* Duration (only if limited) */}
              {subscriptionType === 'limited' && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Duration (Days)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {DURATION_PRESETS.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSubscriptionDays(d)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          subscriptionDays === d ? 'bg-[#E63946] text-white border-[#E63946]' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={subscriptionDays}
                    onChange={e => setSubscriptionDays(parseInt(e.target.value) || 1)}
                    className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none transition-colors"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full mt-2 py-3 bg-[#E63946] hover:bg-[#FF6B35] text-white font-bold text-sm rounded-xl transition-all shadow-md"
              >
                Register & Authorize
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit/Renew Modal */}
      {editRestaurant && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-5">
              <h3 className="text-lg font-bold text-[#2B2D42]">Manage Subscription — {editRestaurant.name}</h3>
              <button onClick={() => setEditRestaurant(null)} className="text-xl text-slate-400 hover:text-[#2B2D42]">✕</button>
            </div>

            {/* Current info */}
            <div className="bg-slate-50 rounded-xl p-4 mb-5 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-slate-400">Current Status:</span><span className="font-bold">{getSubscriptionBadge(editRestaurant).label}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Activated:</span><span>{editRestaurant.activated_at ? new Date(editRestaurant.activated_at).toLocaleDateString() : '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Expires:</span><span>{editRestaurant.subscription_status === 'unlimited' ? 'Never' : (editRestaurant.expires_at ? new Date(editRestaurant.expires_at).toLocaleDateString() : '—')}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Remaining:</span><span className="font-bold">{getRemainingDays(editRestaurant)}</span></div>
            </div>

            {/* Set new subscription */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">New Subscription Type</label>
                <div className="flex gap-3">
                  <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold cursor-pointer transition-all ${
                    editSubType === 'unlimited' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}>
                    <input type="radio" name="editSubType" value="unlimited" checked={editSubType === 'unlimited'} onChange={() => setEditSubType('unlimited')} className="sr-only" />
                    Unlimited
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold cursor-pointer transition-all ${
                    editSubType === 'limited' ? 'border-[#E63946] bg-red-50 text-[#E63946]' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}>
                    <input type="radio" name="editSubType" value="limited" checked={editSubType === 'limited'} onChange={() => setEditSubType('limited')} className="sr-only" />
                    Limited Duration
                  </label>
                </div>
              </div>

              {editSubType === 'limited' && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Duration (Days)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {DURATION_PRESETS.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setEditSubDays(d)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          editSubDays === d ? 'bg-[#E63946] text-white border-[#E63946]' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={editSubDays}
                    onChange={e => setEditSubDays(parseInt(e.target.value) || 1)}
                    className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-[#2B2D42] text-sm focus:border-[#E63946] outline-none transition-colors"
                  />
                </div>
              )}

              <button
                onClick={handleRenew}
                disabled={editLoading}
                className="w-full mt-2 py-3 bg-[#E63946] hover:bg-[#FF6B35] text-white font-bold text-sm rounded-xl transition-all shadow-md disabled:opacity-50"
              >
                {editLoading ? 'Updating...' : 'Activate / Renew Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
