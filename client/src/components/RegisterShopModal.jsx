import React, { useState } from 'react';
import { Store, User, Phone, IndianRupee, QrCode, X, CheckCircle, ArrowRight, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { API_BASE } from '../config';

export default function RegisterShopModal({ 
  isOpen, 
  onClose, 
  onShopCreated, 
  shops = [], 
  onSelectShop,
  initialMode = 'register'
}) {
  const [mode, setMode] = useState(initialMode); // 'register' or 'login'

  // Registration Form State
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [shopId, setShopId] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdShop, setCreatedShop] = useState(null);

  // Login Form State
  const [loginPhone, setLoginPhone] = useState('');
  const [loginError, setLoginError] = useState('');
  const [matchedShops, setMatchedShops] = useState(null);

  if (!isOpen) return null;

  // Auto-generate slug when shop name changes
  const handleNameChange = (e) => {
    const val = e.target.value;
    setShopName(val);
    const slug = val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    setShopId(slug);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!shopName || !upiId || !shopId) {
      alert('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/shops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: shopId,
          name: shopName,
          ownerName,
          phone,
          upiId,
          rates: {
            bwSingle: 2,
            bwDouble: 3,
            colorSingle: 10,
            colorDouble: 16,
            idCard: 10,
            minOrder: 1
          }
        })
      });

      const data = await res.json();
      if (res.ok) {
        setCreatedShop(data);
        if (onShopCreated) onShopCreated(data);
      } else {
        alert(data.error || 'Failed to register shop');
      }
    } catch (err) {
      alert('Network error registering shop');
    } finally {
      setLoading(false);
    }
  };

  // Login handler
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setLoginError('');
    setMatchedShops(null);

    const cleanInput = loginPhone.trim().replace(/\D/g, '').slice(-10);
    if (!cleanInput || cleanInput.length < 10) {
      setLoginError('Enter a valid 10-digit mobile number');
      return;
    }

    const matches = shops.filter(s => {
      const p = (s.phone || '').trim().replace(/\D/g, '').slice(-10);
      return p && p === cleanInput;
    });

    if (matches.length === 0) {
      setLoginError('No shop linked with this number');
      return;
    }

    if (matches.length === 1) {
      handleChooseShop(matches[0]);
    } else {
      setMatchedShops(matches);
    }
  };

  const handleChooseShop = (shop) => {
    localStorage.setItem('printo_shopId', shop.id);
    if (onSelectShop) onSelectShop(shop.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] max-w-[440px] w-full p-6 sm:p-8 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.2)] border border-slate-100 ring-1 ring-slate-900/5 relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Soft Ambient Radial Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gradient-to-b from-amber-100/50 via-orange-50/20 to-transparent blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-800 w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer border border-slate-100 z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {createdShop ? (
          /* ======================================================== */
          /* SUCCESS VIEW                                             */
          /* ======================================================== */
          <div className="text-center space-y-4 py-4 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-100 shadow-sm ring-4 ring-emerald-50/50">
              <CheckCircle className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Shop Registered!</h3>
              <p className="text-xs text-slate-600">
                <span className="font-bold text-slate-900">{createdShop.name}</span> is ready for automated printing.
              </p>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-4 text-left space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Shop ID:</span>
                <span className="font-mono font-bold text-[#b84b00]">{createdShop.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer Link:</span>
                <span className="font-mono text-slate-800 font-semibold">getprinto.in/s/{createdShop.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payout UPI:</span>
                <span className="font-mono text-emerald-600 font-bold">{createdShop.upiId}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full py-3.5 bg-[#b84b00] hover:bg-[#9f4000] text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#b84b00]/25 transition-all cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        ) : mode === 'login' ? (
          /* ======================================================== */
          /* PREMIUM LOGIN WITH MOBILE NUMBER VIEW                    */
          /* ======================================================== */
          <div className="space-y-6 relative z-10">
            {/* Header with Luxury Embossed Icon */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-amber-50 to-orange-100/70 text-[#b84b00] border border-amber-200/80 flex items-center justify-center mx-auto shadow-sm shadow-amber-900/10 ring-4 ring-amber-50/60">
                <Store className="w-6 h-6" strokeWidth={2.2} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Owner Dashboard Login</h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Enter your registered mobile number to open your shop dashboard.
              </p>
            </div>

            {!matchedShops ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                    Registered Mobile Number
                  </label>
                  
                  {/* Clean High-End Input Box */}
                  <div className="flex items-center bg-slate-50/80 hover:bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-[#b84b00] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#b84b00]/10 transition-all p-1.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl shadow-2xs border border-slate-200/80 text-xs font-bold text-slate-700 select-none">
                      <span className="text-sm leading-none">🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      autoFocus
                      placeholder="Enter 10-digit mobile number"
                      value={loginPhone}
                      onChange={(e) => {
                        setLoginPhone(e.target.value);
                        if (loginError) setLoginError('');
                      }}
                      className="w-full text-sm font-bold tracking-wider font-mono px-3.5 py-2 bg-transparent focus:outline-none text-slate-900 placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal placeholder:text-xs"
                      required
                    />
                  </div>

                  {loginError && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-600 font-semibold bg-rose-50/90 px-3 py-1.5 rounded-xl border border-rose-200/60 animate-in fade-in duration-150">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}
                </div>

                {/* Premium Gradient Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-[#b84b00] via-[#c65507] to-[#b84b00] hover:from-[#9f4000] hover:to-[#9f4000] text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-[#b84b00]/25 hover:shadow-xl hover:shadow-[#b84b00]/30 active:scale-[0.99] transition-all cursor-pointer text-center"
                >
                  Open Dashboard
                </button>
              </form>
            ) : (
              /* If multiple shops found for this mobile number */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Select which shop to open:</span>
                  <button
                    onClick={() => { setMatchedShops(null); setLoginError(''); }}
                    className="text-xs text-[#b84b00] hover:underline font-bold cursor-pointer"
                  >
                    Change number
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                  {matchedShops.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleChooseShop(s)}
                      className="p-3.5 rounded-2xl border border-slate-200/80 hover:border-[#b84b00] hover:bg-amber-50/50 transition-all cursor-pointer flex items-center justify-between gap-3 group bg-white shadow-2xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm group-hover:text-[#b84b00] truncate">
                          {s.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          ID: <span className="font-mono text-slate-700 font-medium">{s.id}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-xs font-bold text-[#b84b00] bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/60 group-hover:bg-[#b84b00] group-hover:text-white transition-all">
                        Open
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clean Footer Link */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Don't have a shop registered yet?</span>
              <button
                type="button"
                onClick={() => { setMode('register'); setLoginError(''); }}
                className="font-bold text-[#b84b00] hover:underline cursor-pointer"
              >
                Register New Shop
              </button>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* PREMIUM REGISTER NEW SHOP VIEW                           */
          /* ======================================================== */
          <form onSubmit={handleRegisterSubmit} className="space-y-4 relative z-10">
            <div className="text-center space-y-1 pb-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-amber-50 to-orange-100/70 text-[#b84b00] flex items-center justify-center mx-auto mb-2 border border-amber-200/80 shadow-sm shadow-amber-900/10 ring-4 ring-amber-50/60">
                <Store className="w-6 h-6" strokeWidth={2.2} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Register Your Xerox Shop</h2>
              <p className="text-xs text-slate-500">Automate customer prints in less than 2 minutes</p>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">Shop / Cyber Cafe Name *</label>
              <div className="flex items-center border border-slate-200 rounded-2xl px-3.5 py-1 bg-slate-50/70 focus-within:border-[#b84b00] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#b84b00]/10 transition-all shadow-2xs">
                <Store className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                <input
                  type="text"
                  placeholder="e.g. Gupta Xerox & Cyber Cafe"
                  value={shopName}
                  onChange={handleNameChange}
                  className="w-full text-xs py-2 bg-transparent focus:outline-none font-medium text-slate-900"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">Owner Name</label>
                <div className="flex items-center border border-slate-200 rounded-2xl px-3.5 py-1 bg-slate-50/70 focus-within:border-[#b84b00] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#b84b00]/10 transition-all shadow-2xs">
                  <User className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Gupta"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full text-xs py-2 bg-transparent focus:outline-none text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">Mobile No. *</label>
                <div className="flex items-center border border-slate-200 rounded-2xl px-3.5 py-1 bg-slate-50/70 focus-within:border-[#b84b00] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#b84b00]/10 transition-all shadow-2xs">
                  <Phone className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs py-2 bg-transparent focus:outline-none font-mono font-medium text-slate-900"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Your UPI ID (For Direct Payments) *
              </label>
              <input
                type="text"
                placeholder="e.g. 9876543210@paytm or guptaxerox@okaxis"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-2xl bg-slate-50/70 focus:bg-white focus:border-[#b84b00] focus:ring-4 focus:ring-[#b84b00]/10 transition-all font-mono font-medium text-slate-900"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">Customers pay directly to this UPI. Zero commission, zero delay.</p>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">Custom Shop ID / Slug</label>
              <div className="flex items-center border border-slate-200 rounded-2xl overflow-hidden px-3.5 bg-slate-50/70 focus-within:border-[#b84b00] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#b84b00]/10 transition-all shadow-2xs">
                <span className="text-xs text-slate-400 font-mono">getprinto.in/s/</span>
                <input
                  type="text"
                  value={shopId}
                  onChange={(e) => setShopId(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                  className="w-full text-xs py-2.5 px-1 bg-transparent font-mono font-bold text-[#b84b00] focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-[#b84b00] via-[#c65507] to-[#b84b00] hover:from-[#9f4000] hover:to-[#9f4000] text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#b84b00]/25 hover:shadow-xl hover:shadow-[#b84b00]/30 active:scale-[0.99] transition-all cursor-pointer text-center"
              >
                {loading ? 'Creating Shop...' : 'Register Shop & Generate QR Standee'}
              </button>
            </div>

            {/* Switch to Login */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Already registered your shop?</span>
              <button
                type="button"
                onClick={() => { setMode('login'); setLoginError(''); }}
                className="font-bold text-[#b84b00] hover:underline cursor-pointer"
              >
                Login
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
