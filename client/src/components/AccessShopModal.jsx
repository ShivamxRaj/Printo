import React, { useState } from 'react';
import { Store, Phone, ArrowRight, X, AlertCircle } from 'lucide-react';

export default function AccessShopModal({ isOpen, onClose, shops = [], onSelectShop, onOpenRegister }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [matchedShops, setMatchedShops] = useState(null);

  if (!isOpen) return null;

  const handleLookup = (e) => {
    e.preventDefault();
    setError('');
    setMatchedShops(null);

    const cleanInput = phoneNumber.trim().replace(/\D/g, '').slice(-10);
    if (!cleanInput || cleanInput.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    // Match shops strictly linked to this phone number
    const matches = shops.filter(s => {
      const p = (s.phone || '').trim().replace(/\D/g, '').slice(-10);
      return p && p === cleanInput;
    });

    if (matches.length === 0) {
      setError(`No shop found linked to +91 ${cleanInput}. Please check the number or register a new shop.`);
      return;
    }

    // If exactly 1 shop matches, open it immediately
    if (matches.length === 1) {
      handleChoose(matches[0]);
    } else {
      // If multiple shops are linked to this same number, let the owner choose
      setMatchedShops(matches);
    }
  };

  const handleChoose = (shop) => {
    localStorage.setItem('printo_shopId', shop.id);
    onSelectShop(shop.id);
    onClose();
  };

  const handleReset = () => {
    setMatchedShops(null);
    setError('');
    setPhoneNumber('');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-5">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-[#b84b00] border border-amber-200/80 flex items-center justify-center mx-auto shadow-xs">
              <Store className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Owner Dashboard Login</h2>
            <p className="text-xs text-slate-500">
              Enter your registered mobile number to open your shop dashboard.
            </p>
          </div>

          {!matchedShops ? (
            /* PHONE INPUT FORM */
            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Registered Mobile Number
                </label>
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:border-[#b84b00] focus-within:ring-1 focus-within:ring-[#b84b00] bg-slate-50/60">
                  <div className="px-3.5 py-3 text-xs font-bold text-slate-500 bg-slate-100 border-r border-slate-200 select-none">
                    +91
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    autoFocus
                    placeholder="Enter 10-digit mobile number"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      if (error) setError('');
                    }}
                    className="w-full text-sm font-semibold tracking-wider font-mono px-3.5 py-3 bg-transparent focus:outline-none text-slate-900 placeholder:text-slate-400 placeholder:font-sans placeholder:tracking-normal placeholder:font-normal"
                    required
                  />
                </div>
                {error && (
                  <div className="flex items-start gap-1.5 text-xs text-rose-600 font-medium mt-2 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#b84b00] hover:bg-[#9f4000] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#b84b00]/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Access Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* MULTIPLE SHOPS SELECTION (IF SENDER HAS 2+ SHOPS ON SAME PHONE) */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Select which shop to open:</span>
                <button
                  onClick={handleReset}
                  className="text-xs text-[#b84b00] hover:underline font-semibold cursor-pointer"
                >
                  Change number
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {matchedShops.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleChoose(s)}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-[#b84b00] hover:bg-amber-50/60 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-sm group-hover:text-[#b84b00]">
                        {s.name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        ID: <span className="font-mono text-slate-700">{s.id}</span> • UPI: {s.upiId}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-[#b84b00] group-hover:translate-x-0.5 transition-transform">
                      <span>Open</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">New to Printo?</span>
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
