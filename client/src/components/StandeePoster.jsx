import React, { useState, useEffect } from 'react';
import { Printer, Smartphone, UploadCloud, CreditCard, CheckCircle2, ShieldCheck } from 'lucide-react';
import { API_BASE } from '../config';

export default function StandeePoster({ shopId = 'shivam' }) {
  const [shop, setShop] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/shops/${shopId}`)
      .then(res => res.json())
      .then(data => {
        setShop(data);
        if (data?.name) {
          document.title = `Counter Standee Poster — ${data.name} | Printo`;
        }
      })
      .catch(err => console.error('Error fetching shop for standee:', err));
  }, [shopId]);

  if (!shop) {
    return <div className="p-10 text-center font-bold">Loading Standee Poster...</div>;
  }

  const rates = {
    bwSingle: shop.rates?.bwSingle ?? 2,
    bwDouble: shop.rates?.bwDouble ?? 3,
    colorSingle: shop.rates?.colorSingle ?? 10,
    colorDouble: shop.rates?.colorDouble ?? 16,
    idCard: shop.rates?.idCard ?? 10,
    minOrder: shop.rates?.minOrder ?? 1,
  };

  return (
    <div className="min-h-screen bg-slate-200 py-8 px-4 flex flex-col items-center">
      {/* Top action bar (hidden during print) */}
      <div className="print:hidden mb-6 flex items-center gap-4 bg-white px-5 py-3 rounded-2xl shadow-md border border-slate-300">
        <span className="text-sm font-semibold text-slate-700">Counter Poster Preview</span>
        <button
          onClick={() => window.print()}
          className="px-5 py-2 bg-[#b84b00] hover:bg-[#9f4000] text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print This Poster (A4)</span>
        </button>
      </div>

      {/* A4 STAND-UP POSTER CONTAINER */}
      <div className="w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-2xl p-10 flex flex-col justify-between border border-slate-300 rounded-sm print:shadow-none print:border-none print:p-8 print:w-full print:m-0">
        
        {/* Top Header */}
        <div className="text-center space-y-3 border-b-2 border-[#b84b00] pb-6">
          {/* Printo Brand Logo */}
          <div className="flex justify-center mb-1">
            <img
              src="/printo-logo-transparent.png"
              alt="Printo Logo"
              className="h-12 w-auto object-contain select-none"
            />
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[#b84b00] text-xs font-bold tracking-widest uppercase">
            100% Automated Self-Service
          </div>
          <h1 className="text-4xl font-bold text-slate-950 tracking-tight">
            INSTANT SMART PRINTING
          </h1>
          <p className="text-xl font-bold text-[#b84b00]">
            {shop.name}
          </p>
        </div>

        {/* Center: Big QR Code & Call to Action */}
        <div className="my-6 flex flex-col items-center text-center space-y-4">
          <div className="p-4 bg-white border-4 border-slate-900 rounded-3xl shadow-xl">
            <img
              src={`${API_BASE}/api/standee/${shop.id}/qr?origin=${encodeURIComponent(window.location.origin)}`}
              alt={`High resolution QR code to scan and print documents directly at ${shop.name}`}
              className="w-64 h-64 object-contain"
            />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 flex items-center justify-center gap-2">
              <span>SCAN WITH PHONE CAMERA</span>
            </h2>
          </div>
        </div>

        {/* 4 Simple Steps */}
        <div className="grid grid-cols-4 gap-3 text-center my-4">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col items-center">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#b84b00] flex items-center justify-center font-bold text-sm mb-2">
              <Smartphone className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-[#b84b00] uppercase">Step 1</span>
            <h4 className="text-xs font-bold text-slate-900 mt-0.5">Scan QR</h4>
            <p className="text-[10px] text-slate-500 mt-1">Open camera & scan</p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col items-center">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#b84b00] flex items-center justify-center font-bold text-sm mb-2">
              <UploadCloud className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-[#b84b00] uppercase">Step 2</span>
            <h4 className="text-xs font-bold text-slate-900 mt-0.5">Upload</h4>
            <p className="text-[10px] text-slate-500 mt-1">PDF or Aadhaar card</p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col items-center">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#b84b00] flex items-center justify-center font-bold text-sm mb-2">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-[#b84b00] uppercase">Step 3</span>
            <h4 className="text-xs font-bold text-slate-900 mt-0.5">Pay UPI</h4>
            <p className="text-[10px] text-slate-500 mt-1">GPay, PhonePe, Paytm</p>
          </div>

          <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 flex flex-col items-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm mb-2">
              <Printer className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Step 4</span>
            <h4 className="text-xs font-bold text-slate-900 mt-0.5">Collect Print</h4>
            <p className="text-[10px] text-slate-500 mt-1">Fresh from printer</p>
          </div>
        </div>

        {/* Pricing Banner Card - Matches Dashboard 1-Side & 2-Sides Exactly */}
        <div className="bg-slate-950 text-white rounded-2xl p-4 grid grid-cols-3 divide-x divide-slate-800 text-center my-2 shadow-inner">
          {/* Black & White */}
          <div className="px-2">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
              Black & White
            </span>
            <div className="flex items-center justify-center gap-2.5">
              <div>
                <span className="text-[9px] text-slate-500 font-semibold block uppercase">1-Side</span>
                <span className="text-lg font-black text-white">₹{rates.bwSingle}</span>
              </div>
              <div className="text-slate-700 text-sm font-light">/</div>
              <div>
                <span className="text-[9px] text-slate-500 font-semibold block uppercase">2-Sides</span>
                <span className="text-lg font-black text-white">₹{rates.bwDouble}</span>
              </div>
            </div>
          </div>

          {/* Full Color */}
          <div className="px-2">
            <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider block mb-1">
              Full Color
            </span>
            <div className="flex items-center justify-center gap-2.5">
              <div>
                <span className="text-[9px] text-amber-400/70 font-semibold block uppercase">1-Side</span>
                <span className="text-lg font-black text-amber-400">₹{rates.colorSingle}</span>
              </div>
              <div className="text-amber-500/40 text-sm font-light">/</div>
              <div>
                <span className="text-[9px] text-amber-400/70 font-semibold block uppercase">2-Sides</span>
                <span className="text-lg font-black text-amber-400">₹{rates.colorDouble}</span>
              </div>
            </div>
          </div>

          {/* Smart ID / Aadhaar */}
          <div className="px-2 flex flex-col justify-center">
            <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">
              Smart ID / Aadhaar
            </span>
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-lg font-black text-emerald-400">₹{rates.idCard}</span>
              <span className="text-[10px] text-slate-400 font-medium">/ card (Front+Back)</span>
            </div>
          </div>
        </div>

        {/* Footer Privacy Notice */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-center text-[10px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>100% Data Privacy: Files are automatically destroyed immediately after printing.</span>
          </div>
        </div>

      </div>
    </div>
  );
}

