import React, { useState } from 'react';
import { Printer, Home, ArrowLeft, Search, HelpCircle } from 'lucide-react';

export default function NotFoundPage({ onGoHome, onGoDashboard, onSearchShop }) {
  const [shopInput, setShopInput] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (shopInput.trim()) {
      window.location.href = `/s/${shopInput.trim().toLowerCase()}`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900 font-sans">
      
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#b84b00] text-white flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">
              Print<span className="text-[#b84b00]">o</span>
            </span>
          </div>
          <button
            onClick={onGoHome}
            className="text-xs font-bold text-slate-600 hover:text-[#b84b00] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
        </div>
      </header>

      {/* Main 404 Hero */}
      <main className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        
        {/* Big visual number */}
        <div className="relative inline-block">
          <span className="text-8xl sm:text-9xl font-black text-slate-200 select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl sm:text-2xl font-black text-[#b84b00] bg-white px-4 py-1 rounded-full border border-amber-200 shadow-sm">
              Page Not Found
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Oops! This print page doesn't exist.
          </h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            The link might be mistyped, or the shopkeeper may have changed their Shop ID.
          </p>
        </div>

        {/* Find Shop Input */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 max-w-md mx-auto">
          <form onSubmit={handleSearch} className="space-y-3">
            <label className="text-xs font-bold text-slate-700 block text-left">
              Looking for a specific print shop?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter shop-id (e.g. demo-shop)"
                value={shopInput}
                onChange={(e) => setShopInput(e.target.value)}
                className="flex-1 text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-[#b84b00] font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#b84b00] hover:bg-[#9a3e00] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Go</span>
              </button>
            </div>
          </form>
        </div>

        {/* Navigation Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <button
            onClick={onGoHome}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Homepage</span>
          </button>
          <button
            onClick={onGoDashboard}
            className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <span>Open Shopkeeper Dashboard</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>© 2026 Printo Technologies • Smart Self-Service Printing Gateway</p>
      </footer>

    </div>
  );
}

