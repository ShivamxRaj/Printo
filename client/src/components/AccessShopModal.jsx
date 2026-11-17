import React, { useState } from 'react';
import { Store, Phone, Search, ArrowRight, X, CheckCircle, ExternalLink } from 'lucide-react';

export default function AccessShopModal({ isOpen, onClose, shops = [], onSelectShop, onOpenRegister }) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const q = searchQuery.trim().toLowerCase();
  const filteredShops = shops.filter(s => {
    if (!q) return true;
    const nameMatch = (s.name || '').toLowerCase().includes(q);
    const idMatch = (s.id || '').toLowerCase().includes(q);
    const phoneMatch = (s.phone || '').includes(q);
    const ownerMatch = (s.ownerName || '').toLowerCase().includes(q);
    return nameMatch || idMatch || phoneMatch || ownerMatch;
  });

  const handleChoose = (shop) => {
    localStorage.setItem('printo_shopId', shop.id);
    onSelectShop(shop.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#b84b00] border border-amber-200 flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Access Your Shop Dashboard</h2>
              <p className="text-xs text-slate-500">Search by your mobile number or shop name</p>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Enter phone number or shop name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-[#b84b00] font-medium"
            />
          </div>

          {/* Shop List */}
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {filteredShops.length > 0 ? (
              filteredShops.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleChoose(s)}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-[#b84b00] hover:bg-amber-50/50 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm truncate group-hover:text-[#b84b00]">
                        {s.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {s.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                      {s.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {s.phone}
                        </span>
                      )}
                      <span>UPI: {s.upiId}</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-[#b84b00] group-hover:translate-x-0.5 transition-transform">
                    <span>Open</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                No registered shop found matching "{searchQuery}".
              </div>
            )}
          </div>

          {/* Bottom Switch to Register */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Need to register a new shop?</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenRegister) onOpenRegister();
              }}
              className="font-bold text-[#b84b00] hover:underline cursor-pointer"
            >
              + Register New Shop
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
