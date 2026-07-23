import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../utils/config';
import { 
  Search, ShieldAlert, Award, Calendar, RefreshCw, Power, PowerOff, 
  Sparkles, Building, Trash2, Key, History, Mail, User, CheckCircle2, Clock 
} from 'lucide-react';

const BACKEND_URL = API_URL;

const DURATION_PRESETS = [7, 15, 30, 60, 90, 180];

function getSubscriptionBadge(r) {
  if (!r.is_active) return { label: 'Suspended', cls: 'bg-red-50 text-red-600 border-red-200' };
  if (r.plan === 'trial') {
    const now = new Date();
    const exp = r.expires_at ? new Date(r.expires_at) : null;
    if (exp && now > exp) return { label: 'Trial Expired', cls: 'bg-zinc-100 text-zinc-500 border-zinc-300' };
    return { label: 'Free Trial', cls: 'bg-amber-50 text-amber-600 border-amber-200' };
  }
  if (r.subscription_status === 'unlimited') return { label: 'Paid (Unlimited)', cls: 'bg-blue-50 text-blue-600 border-blue-200' };
  if (r.subscription_status === 'expired') return { label: 'Expired', cls: 'bg-red-50 text-red-600 border-red-200' };
  const now = new Date();
  const exp = r.expires_at ? new Date(r.expires_at) : null;
  if (exp && now > exp) return { label: 'Expired', cls: 'bg-red-50 text-red-600 border-red-200' };
  return { label: 'Paid (Premium)', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
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
  const [trialHistory, setTrialHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trialHistoryLoading, setTrialHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('restaurants'); // 'restaurants' | 'trial-history'

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'trial-active' | 'trial-expired' | 'paid' | 'suspended'
  const [historySearch, setHistorySearch] = useState('');

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editRestaurant, setEditRestaurant] = useState(null);

  // Create form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [subscriptionType, setSubscriptionType] = useState('limited');
  const [subscriptionDays, setSubscriptionDays] = useState(30);

  // Edit/Manage Modal trial actions states
  const [editSubType, setEditSubType] = useState('limited');
  const [editSubDays, setEditSubDays] = useState(30);
  const [extendDays, setExtendDays] = useState(7);
  const [convertDays, setConvertDays] = useState(30);
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

  useEffect(() => {
    if (activeTab === 'trial-history') {
      loadTrialHistory();
    }
  }, [activeTab]);

  const loadRestaurants = async () => {
    setLoading(true);
    try {
      const headers = authHeaders();
      const res = await fetch(`${BACKEND_URL}/api/v1/super/restaurants`, { headers });
      if (res.ok) {
        const result = await res.json();
        setRestaurants(result.data || []);
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

  const loadTrialHistory = async () => {
    setTrialHistoryLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/super/trial-history`, { headers: authHeaders() });
      if (res.ok) {
        const result = await res.json();
        setTrialHistory(result.data || []);
      }
    } catch (err) {
      console.error(err);
    }
    setTrialHistoryLoading(false);
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
    setExtendDays(7);
    setConvertDays(30);
  };

  const handleRenew = async () => {
    if (!editRestaurant) return;
    setEditLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/super/restaurants/${editRestaurant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          plan: editRestaurant.plan === 'trial' ? 'premium' : undefined, // Auto change to premium if renewing/paying
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

  const handleExtendTrial = async (days) => {
    if (!editRestaurant) return;
    setEditLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/super/restaurants/${editRestaurant.id}/trial/extend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ days })
      });
      const result = await res.json();
      if (result.success) {
        setRestaurants(prev => prev.map(r => r.id === editRestaurant.id ? result.data : r));
        setEditRestaurant(null);
      } else {
        setError(result.message || 'Failed to extend trial.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error during trial extension.');
    }
    setEditLoading(false);
  };

  const handleEndTrial = async () => {
    if (!editRestaurant) return;
    if (!confirm('Are you sure you want to end this free trial immediately?')) return;
    setEditLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/super/restaurants/${editRestaurant.id}/trial/end`, {
        method: 'PATCH',
        headers: { ...authHeaders() }
      });
      const result = await res.json();
      if (result.success) {
        setRestaurants(prev => prev.map(r => r.id === editRestaurant.id ? result.data : r));
        setEditRestaurant(null);
      } else {
        setError(result.message || 'Failed to terminate trial.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error during trial termination.');
    }
    setEditLoading(false);
  };

  const handleConvertTrial = async (days) => {
    if (!editRestaurant) return;
    setEditLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/super/restaurants/${editRestaurant.id}/trial/convert`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ subscriptionDays: days })
      });
      const result = await res.json();
      if (result.success) {
        setRestaurants(prev => prev.map(r => r.id === editRestaurant.id ? result.data : r));
        setEditRestaurant(null);
      } else {
        setError(result.message || 'Failed to convert trial.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error during subscription conversion.');
    }
    setEditLoading(false);
  };

  // Filter restaurants
  const filteredRestaurants = restaurants.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.owner_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    const now = new Date();
    const exp = r.expires_at ? new Date(r.expires_at) : null;
    const isTrial = r.plan === 'trial';
    const isExpired = (r.subscription_status === 'expired') || (exp && now > exp);

    if (statusFilter === 'suspended') return !r.is_active;
    if (!r.is_active) {
      if (statusFilter !== 'all') return false;
    }

    if (statusFilter === 'trial-active') return isTrial && !isExpired;
    if (statusFilter === 'trial-expired') return isTrial && isExpired;
    if (statusFilter === 'paid') return !isTrial && r.is_active;
    
    return true;
  });

  // Filter trial history
  const filteredHistory = trialHistory.filter(h => {
    const q = historySearch.toLowerCase();
    return h.email.toLowerCase().includes(q) || h.restaurant_name.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-[#F9F9F9] text-[#2B2D42] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔑</span>
          <h1 className="text-xl font-black tracking-tight text-[#2B2D42]">
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
        {/* Navigation Tabs */}
        <div className="flex gap-4 border-b border-slate-200 mb-8 pb-px">
          <button 
            onClick={() => setActiveTab('restaurants')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'restaurants' ? 'border-[#E63946] text-[#E63946]' : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Building size={16} />
            Restaurants
          </button>
          <button 
            onClick={() => setActiveTab('trial-history')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'trial-history' ? 'border-[#E63946] text-[#E63946]' : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <History size={16} />
            Free Trial History
          </button>
        </div>

        {activeTab === 'restaurants' && (
          <>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-[#2B2D42]">Restaurants</h2>
                <p className="text-slate-400 text-sm mt-1">Manage, extend, and convert free trials and paid subscription clients</p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="bg-[#E63946] hover:bg-[#FF6B35] text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md shadow-[#E63946]/20 transition-all self-start md:self-auto"
              >
                + Register Restaurant (Manual)
              </button>
            </div>

            {/* Search and Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Search */}
              <div className="relative col-span-1 sm:col-span-2">
                <input 
                  type="text" 
                  placeholder="Search by restaurant name or email..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-[#E63946] outline-none transition-colors text-black"
                />
                <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>

              {/* Status Filter */}
              <div className="w-full">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#E63946] text-slate-600 transition-colors"
                >
                  <option value="all">All Statuses</option>
                  <option value="trial-active">Active Trials</option>
                  <option value="trial-expired">Expired Trials</option>
                  <option value="paid">Paid Subscribers</option>
                  <option value="suspended">Suspended Accounts</option>
                </select>
              </div>
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
                        <th className="px-4 py-4">Name & Slug</th>
                        <th className="px-4 py-4">Owner Email</th>
                        <th className="px-4 py-4">Plan / Duration</th>
                        <th className="px-4 py-4">Activation</th>
                        <th className="px-4 py-4">Expiry Date</th>
                        <th className="px-4 py-4">Remaining</th>
                        <th className="px-4 py-4">Badge</th>
                        <th className="px-4 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRestaurants.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="px-6 py-10 text-center text-slate-400 italic">No restaurants registered matching filters.</td>
                        </tr>
                      ) : (
                        filteredRestaurants.map(r => {
                          const badge = getSubscriptionBadge(r);
                          const isTrial = r.plan === 'trial';
                          return (
                            <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-4">
                                <div className="font-bold text-[#2B2D42]">{r.name}</div>
                                <div className="font-mono text-xs text-[#E63946]">/{r.slug}</div>
                              </td>
                              <td className="px-4 py-4 text-xs">{r.owner_email}</td>
                              <td className="px-4 py-4 text-xs font-semibold text-[#2B2D42]">
                                {isTrial ? (
                                  <span className="text-amber-600 font-bold">14-Day Free Trial</span>
                                ) : (
                                  <span>{r.subscription_status === 'unlimited' ? 'Paid (Unlimited)' : `${r.subscription_days || '—'} Days Premium`}</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-xs text-slate-400">
                                {r.activated_at ? new Date(r.activated_at).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-4 py-4 text-xs text-slate-400">
                                {r.subscription_status === 'unlimited' ? 'Never' : (r.expires_at ? new Date(r.expires_at).toLocaleDateString() : '—')}
                              </td>
                              <td className="px-4 py-4 text-xs font-bold text-black">
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
                                    {r.is_active ? 'Suspend' : 'Reactivate'}
                                  </button>
                                  <button
                                    onClick={() => openEditModal(r)}
                                    className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                                  >
                                    Manage
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
          </>
        )}

        {activeTab === 'trial-history' && (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-[#2B2D42]">Free Trial History</h2>
                <p className="text-slate-400 text-sm mt-1">Audit log of all registered free trials and conversion status</p>
              </div>
              <button 
                onClick={loadTrialHistory}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                title="Refresh History"
              >
                <RefreshCw size={16} className={trialHistoryLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {/* History Search Bar */}
            <div className="relative mb-6">
              <input 
                type="text" 
                placeholder="Search history by name or email..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="w-full max-w-md pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-[#E63946] outline-none transition-colors text-black"
              />
              <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
            </div>

            {trialHistoryLoading ? (
              <div className="text-center py-20 text-slate-400">Loading trial history...</div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.035)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-500">
                    <thead className="text-xs uppercase bg-slate-50 border-b border-slate-200 text-slate-400">
                      <tr>
                        <th className="px-6 py-4">Claimed Email</th>
                        <th className="px-6 py-4">Restaurant</th>
                        <th className="px-6 py-4">Trial Start</th>
                        <th className="px-6 py-4">Trial End</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Paid Subscription</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredHistory.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-10 text-center text-slate-400 italic">No trial claims recorded.</td>
                        </tr>
                      ) : (
                        filteredHistory.map(h => (
                          <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-xs text-[#2B2D42]">{h.email}</td>
                            <td className="px-6 py-4 font-bold text-xs">{h.restaurant_name}</td>
                            <td className="px-6 py-4 text-xs text-slate-400">{new Date(h.trial_start).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-xs text-slate-400">{new Date(h.trial_end).toLocaleDateString()}</td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                                Claimed
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {h.subscription_purchased ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                                  <CheckCircle2 size={14} /> Yes (Upgraded)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                  <Clock size={14} /> No
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Register Restaurant Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-5">
              <h3 className="text-lg font-bold text-[#2B2D42]">Register Restaurant (Manual)</h3>
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
                className="w-full mt-2 py-3 bg-[#E63946] hover:bg-[#FF6B35] text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer"
              >
                Register & Authorize
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit/Manage Subscription & Trial Modal */}
      {editRestaurant && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl w-full max-w-lg p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-5">
              <h3 className="text-lg font-bold text-[#2B2D42]">
                {editRestaurant.plan === 'trial' ? 'Manage Free Trial' : 'Manage Subscription'} — {editRestaurant.name}
              </h3>
              <button onClick={() => setEditRestaurant(null)} className="text-xl text-slate-400 hover:text-[#2B2D42]">✕</button>
            </div>

            {/* Current Info Card */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6 text-xs space-y-2">
              <div className="flex justify-between"><span className="text-slate-400">Owner Email:</span><span className="font-semibold text-black">{editRestaurant.owner_email}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Current Plan:</span><span className="font-black text-[#E63946] uppercase">{editRestaurant.plan}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Activated At:</span><span>{editRestaurant.activated_at ? new Date(editRestaurant.activated_at).toLocaleDateString() : '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Expires At:</span><span>{editRestaurant.subscription_status === 'unlimited' ? 'Never' : (editRestaurant.expires_at ? new Date(editRestaurant.expires_at).toLocaleDateString() : '—')}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Time Remaining:</span><span className="font-bold text-black">{getRemainingDays(editRestaurant)}</span></div>
            </div>

            {/* DYNAMIC FORMS BASED ON PLAN TYPE */}
            {editRestaurant.plan === 'trial' ? (
              <div className="space-y-6 divide-y divide-slate-100">
                {/* 1. EXTEND OR SHORTEN TRIAL */}
                <div className="pt-0">
                  <h4 className="text-sm font-bold text-[#2B2D42] mb-3 flex items-center gap-1.5">
                    <Calendar size={16} className="text-amber-500" />
                    Extend or Shorten Free Trial
                  </h4>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number"
                      value={extendDays}
                      onChange={e => setExtendDays(parseInt(e.target.value) || 0)}
                      placeholder="Days"
                      className="w-24 py-2 px-3 border border-slate-200 rounded-xl text-sm focus:border-[#E63946] outline-none text-black"
                    />
                    <button 
                      onClick={() => handleExtendTrial(extendDays)}
                      disabled={editLoading}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Apply Extension
                    </button>
                    <button 
                      onClick={() => handleExtendTrial(-Math.abs(extendDays))}
                      disabled={editLoading}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-[#E63946] border border-rose-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Reduce Duration
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Positive days extends trial from current expiry; negative values shorten it.</span>
                </div>

                {/* 2. CONVERT TRIAL TO PREMIUM */}
                <div className="pt-5">
                  <h4 className="text-sm font-bold text-[#2B2D42] mb-3 flex items-center gap-1.5">
                    <Award size={16} className="text-emerald-500" />
                    Convert Trial to Paid Subscription
                  </h4>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {DURATION_PRESETS.map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setConvertDays(d)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                            convertDays === d ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {d} Days
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number"
                        min="1"
                        value={convertDays}
                        onChange={e => setConvertDays(parseInt(e.target.value) || 1)}
                        className="w-24 py-2 px-3 border border-slate-200 rounded-xl text-sm focus:border-[#E63946] outline-none text-black"
                      />
                      <button 
                        onClick={() => handleConvertTrial(convertDays)}
                        disabled={editLoading}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        Convert & Activate Paid Plan
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. TERMINATE TRIAL */}
                <div className="pt-5">
                  <h4 className="text-sm font-bold text-[#2B2D42] mb-3 flex items-center gap-1.5 text-red-600">
                    <ShieldAlert size={16} />
                    Terminate Free Trial Immediately
                  </h4>
                  <p className="text-xs text-slate-400 mb-3">This sets the trial expiry date to now and locks out client dashboard access instantly.</p>
                  <button 
                    onClick={handleEndTrial}
                    disabled={editLoading}
                    className="w-full py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-[#E63946] rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    End Trial Immediately
                  </button>
                </div>
              </div>
            ) : (
              /* PREMIUM/PAID SUBSCRIPTION MANAGEMENT */
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Subscription Type</label>
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
                  className="w-full mt-2 py-3 bg-[#E63946] hover:bg-[#FF6B35] text-white font-bold text-sm rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {editLoading ? 'Updating...' : 'Renew / Save Subscription'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
