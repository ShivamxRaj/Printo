import React, { useState } from 'react';
import { Store, User, Phone, IndianRupee, QrCode, X, CheckCircle, ArrowRight } from 'lucide-react';
import { API_BASE } from '../config';

export default function RegisterShopModal({ isOpen, onClose, onShopCreated }) {
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [shopId, setShopId] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdShop, setCreatedShop] = useState(null);

  // Auto-generate slug when shop name changes
  const handleNameChange = (e) => {
    const val = e.target.value;
    setShopName(val);
    const slug = val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    setShopId(slug);
  };

  const handleSubmit = async (e) => {
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
            minOrder: 2
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center transition-all"
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
                <span className="font-mono text-slate-800">/s/{createdShop.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Your UPI VPA:</span>
                <span className="font-mono text-emerald-700 font-bold">{createdShop.upiId}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  window.location.href = `/standee/${createdShop.id}`;
                }}
                className="w-full py-3 bg-[#b84b00] hover:bg-[#9f4000] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>Print Counter QR Standee</span>
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Open Dashboard Now
              </button>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#b84b00] flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Register New Print Shop</h3>
                <p className="text-xs text-slate-500">Start automated QR self-service printing in 60 seconds</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Shop / Cyber Cafe Name *</label>
              <input
                type="text"
                placeholder="e.g. Gupta Xerox & Cyber Cafe"
                value={shopName}
                onChange={handleNameChange}
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-[#b84b00] font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Owner Name</label>
                <input
                  type="text"
                  placeholder="e.g. Amit Gupta"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-[#b84b00]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-[#b84b00]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Personal UPI ID / VPA * <span className="text-emerald-600 font-semibold">(Direct to your Bank)</span>
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
                <span className="text-xs text-slate-400 font-mono">printo.tech/s/</span>
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
          </form>
        )}

      </div>
    </div>
  );
}

