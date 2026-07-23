import React from 'react';
import { X } from 'lucide-react';

export default function RegisterTrialModal({
  show,
  onClose,
  restaurantName,
  slug,
  setSlug,
  email,
  password,
  setPassword,
  error,
  loading,
  onSubmit
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-[#ECECEC] max-w-sm w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 text-left">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-950 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-lg font-extrabold text-[#111111] tracking-tight">Complete Setup</h2>
          <p className="text-[#666666] text-xs mt-1 leading-normal">
            Choose your login password and choose your unique restaurant address.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-150 text-red-600 text-xs font-semibold px-4 py-2.5 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[9px] font-extrabold text-[#666666] uppercase tracking-wider mb-1.5 block">Restaurant Name</label>
            <input
              type="text"
              disabled
              value={restaurantName}
              className="w-full py-2.5 px-4 bg-[#F8F8F8] border border-[#ECECEC] rounded-xl text-xs text-[#999999] outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-[9px] font-extrabold text-[#666666] uppercase tracking-wider mb-1.5 block">Email Address</label>
            <input
              type="email"
              disabled
              value={email}
              className="w-full py-2.5 px-4 bg-[#F8F8F8] border border-[#ECECEC] rounded-xl text-xs text-[#999999] outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-[9px] font-extrabold text-[#666666] uppercase tracking-wider mb-1.5 block">Restaurant URL Slug</label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-xs font-semibold text-zinc-400">/r/</span>
              <input
                type="text"
                required
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                placeholder="gourmet-bistro"
                className="w-full py-2.5 pl-8 pr-4 bg-white border border-[#ECECEC] rounded-xl text-xs text-[#111111] font-bold focus:border-[#111111] outline-none transition-colors"
              />
            </div>
            <span className="text-[9px] text-zinc-400 mt-1 block">Your custom ordering link: yourdomain.com/r/{slug || 'slug'}</span>
          </div>

          <div>
            <label className="text-[9px] font-extrabold text-[#666666] uppercase tracking-wider mb-1.5 block">Choose Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full py-2.5 px-4 bg-white border border-[#ECECEC] rounded-xl text-xs text-[#111111] focus:border-[#111111] outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#111111] hover:bg-zinc-900 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {loading ? 'Creating Restaurant...' : 'Activate 14-Day Free Trial'}
          </button>
        </form>
      </div>
    </div>
  );
}
