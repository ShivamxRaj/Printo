import React, { useState, useEffect } from 'react';
import { Store, User, Phone, IndianRupee, QrCode, X, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';
import { API_BASE } from '../config';

export default function RegisterShopModal({ 
  isOpen, 
  onClose, 
  onShopCreated, 
  shops = [], 
  onSelectShop,
  initialMode = 'register'
}) {
  const [mode, setMode] = useState('register'); // 'register' or 'login'

  useEffect(() => {
    if (isOpen) {
      setMode('register');
      setLoginError('');
      setMatchedShops(null);
      setCreatedShop(null);
    }
  }, [isOpen]);

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
      setLoginError('Please enter a valid 10-digit mobile number');
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
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {createdShop ? (
          /* SUCCESS VIEW */
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900">Shop Registered!</h3>
              <p className="text-xs text-slate-600">
                <span className="font-bold text-slate-900">{createdShop.name}</span> is now ready for automated printing.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Your Shop ID:</span>
                <span className="font-mono font-bold text-[#b84b00]">{createdShop.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer Link:</span>
                <span className="font-mono text-slate-700">getprinto.in/s/{createdShop.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payout UPI ID:</span>
                <span className="font-mono text-emerald-600 font-bold">{createdShop.upiId}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full py-3 bg-[#b84b00] hover:bg-[#9f4000] text-white rounded-xl text-xs font-bold shadow-lg shadow-[#b84b00]/25 transition-all cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        ) : mode === 'login' ? (
          /* ======================================================== */
          /* LOGIN WITH MOBILE NUMBER VIEW                            */
          /* ======================================================== */
          <div className="space-y-5">
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
              <form onSubmit={handleLoginSubmit} className="space-y-4">
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
                      value={loginPhone}
                      onChange={(e) => {
                        setLoginPhone(e.target.value);
                        if (loginError) setLoginError('');
                      }}
                      className="w-full text-sm font-semibold tracking-wider font-mono px-3.5 py-3 bg-transparent focus:outline-none text-slate-900 placeholder:text-slate-400 placeholder:font-sans placeholder:tracking-normal placeholder:font-normal"
                      required
                    />
                  </div>
                  {loginError && (
                    <div className="flex items-start gap-1.5 text-xs text-rose-600 font-medium mt-2 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{loginError}</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#b84b00] hover:bg-[#9f4000] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#b84b00]/25 transition-all cursor-pointer text-center"
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
                    className="text-xs text-[#b84b00] hover:underline font-semibold cursor-pointer"
                  >
                    Change number
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {matchedShops.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleChooseShop(s)}
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
                      <div className="shrink-0 text-xs font-bold text-[#b84b00]">
                        Open
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Switch to Register */}
            <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Don't have a shop registered yet?</span>
              <button
                type="button"
                onClick={() => { setMode('register'); setLoginError(''); }}
                className="font-bold text-[#b84b00] hover:underline cursor-pointer"
              >
                + Register New Shop
              </button>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* REGISTER NEW SHOP VIEW                                   */
          /* ======================================================== */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="text-center space-y-1 pb-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#b84b00] flex items-center justify-center mx-auto mb-2 border border-amber-200">
                <Store className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">Register Your Xerox Shop</h2>
              <p className="text-xs text-slate-500">Automate customer prints in less than 2 minutes</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Shop / Cyber Cafe Name *</label>
              <div className="flex items-center border border-slate-200 rounded-xl px-3 bg-slate-50 focus-within:border-[#b84b00] focus-within:bg-white transition-all">
                <Store className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="e.g. Gupta Xerox & Cyber Cafe"
                  value={shopName}
                  onChange={handleNameChange}
                  className="w-full text-xs py-2.5 bg-transparent focus:outline-none font-medium"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Owner Name</label>
                <div className="flex items-center border border-slate-200 rounded-xl px-3 bg-slate-50 focus-within:border-[#b84b00] focus-within:bg-white transition-all">
                  <User className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Gupta"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full text-xs py-2.5 bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Owner Mobile No. *</label>
                <div className="flex items-center border border-slate-200 rounded-xl px-3 bg-slate-50 focus-within:border-[#b84b00] focus-within:bg-white transition-all">
                  <Phone className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs py-2.5 bg-transparent focus:outline-none font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Your UPI ID (For Direct Customer Payments) *
              </label>
              <input
                type="text"
                placeholder="e.g. 9876543210@paytm or guptaxerox@okaxis"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-[#b84b00] font-mono font-medium"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">Customers pay directly to this UPI. Zero commission, zero delay.</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Custom Shop ID / Slug</label>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden px-3 bg-slate-50 focus-within:border-[#b84b00]">
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
                className="w-full py-3 bg-[#b84b00] hover:bg-[#9f4000] text-white rounded-xl text-xs font-bold shadow-lg shadow-[#b84b00]/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {loading ? 'Creating Shop...' : (
                  <>
                    <span>Register Shop & Generate QR Standee</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Switch to Login */}
            <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
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
