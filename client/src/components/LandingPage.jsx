import React, { useState } from 'react';
import { 
  Printer, Smartphone, QrCode, ArrowRight, CheckCircle2, 
  ShieldCheck, IndianRupee, Zap, Clock, Users, Sparkles, 
  Download, ChevronRight, ChevronDown, FileText, CreditCard,
  Check, HelpCircle, Star, ArrowUpRight, Layers, Menu, X, UploadCloud
} from 'lucide-react';

export default function LandingPage({ onOpenRegister, onGoToDashboard, onGoToDemo, onOpenAccess }) {
  const [openFaq, setOpenFaq] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleFaq = (idx) => {
    setOpenFaq(prev => prev === idx ? null : idx);
  };

  const faqs = [
    {
      q: "Do I need to purchase a new printer or expensive kiosk hardware?",
      a: "Not at all! Printo works seamlessly with your existing Windows PC and any standard desktop printer (HP LaserJet 1020, Canon LBP2900, Epson EcoTank, Brother, etc.). Zero upfront hardware investment required."
    },
    {
      q: "How do customer payments work? Does money go directly to my UPI?",
      a: "Yes, 100% direct! Customers scan your counter standee QR and pay directly to your personal UPI (PhonePe, Google Pay, Paytm Soundbox). There is 0% platform commission, and money settles instantly into your bank account."
    },
    {
      q: "How does Aadhaar Card and ID Card printing work?",
      a: "Customers upload photos of both the Front and Back of their ID card from their phone. Printo's smart engine automatically scales, aligns, and merges both sides onto a single A4 sheet with clean cutting guidelines."
    },
    {
      q: "What about customer document privacy and security?",
      a: "Complete confidentiality is guaranteed. All uploaded files are permanently auto-purged from both the cloud server and your local PC 30 seconds after printing. No customer files remain stored on your computer."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-[#b84b00] selection:text-white overflow-x-hidden">
      
      {/* 1. TOP NAVBAR */}
      <header className="border-b border-slate-100 sticky top-0 z-50 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center">
            <img
              src="/printo-logo-transparent.png"
              alt="Printo Logo"
              className="h-8 sm:h-10 md:h-12 w-auto object-contain select-none"
            />
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-9 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-[#b84b00] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#b84b00] transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-[#b84b00] transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-[#b84b00] transition-colors">FAQ</a>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onOpenRegister}
              className="px-3.5 sm:px-6 py-1.5 sm:py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-xs shadow-sm transition-all cursor-pointer shrink-0"
            >
              Get Started
            </button>

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 sm:p-2 rounded-xl text-slate-700 hover:text-[#b84b00] hover:bg-slate-100 transition-colors focus:outline-hidden shrink-0"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/98 backdrop-blur-md border-t border-slate-100 px-6 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 shadow-lg">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-1.5 text-sm font-semibold text-slate-700 hover:text-[#b84b00] transition-colors">Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-1.5 text-sm font-semibold text-slate-700 hover:text-[#b84b00] transition-colors">How It Works</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-1.5 text-sm font-semibold text-slate-700 hover:text-[#b84b00] transition-colors">Pricing</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="block py-1.5 text-sm font-semibold text-slate-700 hover:text-[#b84b00] transition-colors">FAQ</a>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION (KARLSON-INSPIRED WITH FLAT TECH ILLUSTRATION) */}
      <section className="pt-6 pb-4 sm:pt-8 sm:pb-8 bg-gradient-to-b from-slate-50/70 via-white to-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            
            {/* Left Column: Heading & Text */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left relative z-10">
              
              {/* Karlson-style Kicker Badge */}
              <div>
                <span className="text-xs font-bold text-[#b84b00] tracking-wider uppercase inline-block bg-amber-50 px-3.5 py-1 rounded-full border border-amber-200/60">
                  Welcome to Printo
                </span>
              </div>

              {/* Clean Bold Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-[1.18]">
                Say Goodbye to WhatsApp Prints.{' '}
                <span className="text-[#b84b00]">
                  Automate Your Shop
                </span>
              </h1>

              {/* Sub-headline: Single efficient line */}
              <p className="text-sm sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
                Customers scan your counter QR, pay directly via UPI, and your printer spits out their pages automatically — zero queues, zero manual file transfers.
              </p>

              {/* Action Button with Karlson Paper Plane */}
              <div className="relative pt-2 pb-6">
                <div className="flex items-center justify-center lg:justify-start relative z-10">
                  <button
                    onClick={onOpenRegister}
                    className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#b84b00] hover:bg-[#9f4000] text-white font-bold text-sm shadow-xl shadow-[#b84b00]/25 transition-all cursor-pointer flex items-center justify-center"
                  >
                    Get started free
                  </button>
                </div>

                {/* Karlson Paper Airplane & Dashed Flight Loop (Positioned in left gutter on large desktop screens only) */}
                <div className="hidden xl:block absolute top-6 -left-20 w-48 pointer-events-none select-none z-10">
                  <img
                    src="/karlson-paper-plane.svg"
                    alt=""
                    className="w-full h-auto"
                  />
                </div>
              </div>

            </div>

            {/* Right Column: Karlson-style illustration, responsive bounds */}
            <div className="lg:col-span-6 relative flex items-center justify-center min-h-[320px] sm:min-h-[360px] lg:min-h-[460px] w-full">

              {/* Floating Top-Left Badge: Printer Connected */}
              <div className="absolute top-2 sm:top-4 left-0 sm:-left-4 z-20 bg-white/95 backdrop-blur-md px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl shadow-xl border border-slate-200/80 flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight">Printer Online</p>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-slate-500">HP LaserJet 1020 Ready</p>
                </div>
              </div>

              {/* Main Illustration — contained on mobile, generous on desktop */}
              <img
                src="/karlson-print-illustration.svg"
                alt="Printo smart automated print station workflow"
                className="w-full max-w-sm sm:max-w-md lg:max-w-none lg:w-[125%] h-auto object-contain select-none pointer-events-none"
              />

              {/* Floating Bottom-Right Badge: UPI Payment Received */}
              <div className="absolute bottom-2 sm:bottom-4 right-0 sm:-right-4 z-20 bg-white/95 backdrop-blur-md px-3 py-2 sm:px-4 sm:py-3 rounded-2xl shadow-xl border border-slate-200/80 flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-100 text-[#b84b00] flex items-center justify-center shrink-0">
                  <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight">₹10 UPI Received</p>
                  <p className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span>✓</span> Soundbox Auto-Print
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* 2.5 FEATURES SECTION */}
      <section id="features" className="py-14 sm:py-20 border-t border-slate-100 bg-slate-50/60">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold text-[#b84b00] tracking-wider uppercase">Built for Real Xerox Shops</span>
            <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight">Everything You Need to Run on Autopilot</h2>
            <p className="text-sm text-slate-500">Zero complex setups. No expensive kiosk hardware required.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Feature 1 */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/5 transition-all space-y-4 text-left flex flex-col items-start">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-[#b84b00] flex items-center justify-center shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Direct Personal UPI</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Money comes directly into your Paytm/PhonePe/GPay soundbox. No middleman hold, no gateway delays, and 0% platform commission on prints.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/5 transition-all space-y-4 text-left flex flex-col items-start">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Smart Aadhaar Auto-Merge</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Customers upload Front &amp; Back ID photos from their phone. Our engine automatically aligns and formats both sides onto a single A4 page with cutting guides.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/5 transition-all space-y-4 text-left flex flex-col items-start">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Printer className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Works with ANY Printer</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Whether it is a 10-year-old HP LaserJet 1020, Canon LBP2900, or a modern Epson EcoTank — if it prints on Windows, it works 100% silently with Printo.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/5 transition-all space-y-4 text-left flex flex-col items-start">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Zero-Storage Privacy Purge</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Customer files are permanently deleted 30 seconds after printing. Complete privacy guaranteed, and zero risk of computer viruses from unknown USBs.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/5 transition-all space-y-4 text-left flex flex-col items-start">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Free Printable Counter Poster</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automatically generates a high-resolution, branded A4 standee poster with your shop QR code, rates, and UPI handle. Just print and paste on your desk.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/5 transition-all space-y-4 text-left flex flex-col items-start">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Paper Jam 4-Digit PIN Reprint</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                If paper jams or ink runs out, customers never pay twice. Re-trigger the exact print job with 1 click using their unique 4-digit order PIN.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 3. DEDICATED HOW IT WORKS SECTION (KARLSON-INSPIRED WITH FLAT TECH ILLUSTRATION) */}
      <section id="how-it-works" className="py-16 sm:py-24 border-t border-slate-100 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Column: 3 Simple Visual Steps */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <div>
                <span className="text-xs font-bold text-[#b84b00] tracking-wider uppercase inline-block bg-amber-50 px-3.5 py-1 rounded-full border border-amber-200/60 mb-3">
                  How It Works
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-[1.2]">
                  Effortless Self-Service Printing in 3 Simple Steps
                </h2>
                <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">
                  No saving unknown WhatsApp numbers. No long waiting lines at your counter. Customers simply scan, pay, and collect their prints in seconds.
                </p>
              </div>

              {/* Horizontal Progress Stepper (Matching Hand-Drawn Workflow: Scan QR -> Upload -> Pay using UPI) */}
              <div className="bg-slate-50/80 p-6 sm:p-8 rounded-3xl border border-slate-100">
                <div className="flex items-center justify-between relative">
                  
                  {/* Step 1: Scan QR */}
                  <div className="flex flex-col items-center text-center space-y-2 z-10 flex-1">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border-2 border-[#b84b00] text-[#b84b00] flex items-center justify-center shadow-md shadow-amber-500/10 ring-4 ring-amber-100/70 transition-transform hover:scale-105">
                      <QrCode className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#b84b00] block">01</span>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                        Scan QR
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5 hidden sm:block">
                        Phone camera
                      </p>
                    </div>
                  </div>

                  {/* Connecting Arrow 1 */}
                  <div className="flex items-center justify-center px-1 sm:px-2 z-0">
                    <div className="flex items-center text-[#b84b00]">
                      <div className="w-6 sm:w-14 h-0.5 bg-gradient-to-r from-amber-400 to-emerald-500"></div>
                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 -ml-1" />
                    </div>
                  </div>

                  {/* Step 2: Upload */}
                  <div className="flex flex-col items-center text-center space-y-2 z-10 flex-1">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border-2 border-emerald-600 text-emerald-700 flex items-center justify-center shadow-md shadow-emerald-500/10 ring-4 ring-emerald-100/70 transition-transform hover:scale-105">
                      <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">02</span>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                        Upload
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5 hidden sm:block">
                        PDF or Aadhaar
                      </p>
                    </div>
                  </div>

                  {/* Connecting Arrow 2 */}
                  <div className="flex items-center justify-center px-1 sm:px-2 z-0">
                    <div className="flex items-center text-emerald-600">
                      <div className="w-6 sm:w-14 h-0.5 bg-gradient-to-r from-emerald-500 to-indigo-600"></div>
                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 -ml-1" />
                    </div>
                  </div>

                  {/* Step 3: Pay using UPI */}
                  <div className="flex flex-col items-center text-center space-y-2 z-10 flex-1">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border-2 border-indigo-600 text-indigo-700 flex items-center justify-center shadow-md shadow-indigo-500/10 ring-4 ring-indigo-100/70 transition-transform hover:scale-105">
                      <CreditCard className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 block">03</span>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                        Pay using UPI
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5 hidden sm:block">
                        Auto-prints instantly
                      </p>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Right Column: Original Pristine Karlson Illustration */}
            <div className="lg:col-span-6 flex items-center justify-center relative">
              <div className="relative w-full max-w-lg lg:max-w-xl">
                <img
                  src="/how-it-works-illustration.png"
                  alt="How Printo automated printing workflow works"
                  className="w-full h-auto object-contain select-none"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. PRICING SECTION */}
      <section id="pricing" className="py-16 sm:py-24 lg:py-32 bg-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-10">
          
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12 sm:mb-16">
            <span className="text-xs font-bold text-[#b84b00] tracking-wider uppercase">Affordable For Every Shop</span>
            <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight">Simple, Transparent Pricing</h2>
            <p className="text-sm text-slate-500">0% platform commission on prints. 100% of customer payments go directly to your personal UPI.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            
            {/* Free Plan */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-lg">Starter</h3>
                <p className="text-xs text-slate-500">Free forever for testing and small counters</p>
                <div className="text-4xl font-extrabold text-slate-950">₹0 <span className="text-xs font-normal text-slate-500">/ forever</span></div>
                <ul className="space-y-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#b84b00]" /> 50 Free Automated Prints</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#b84b00]" /> Counter Standee Poster PDF</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#b84b00]" /> Windows Silent Print Agent</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#b84b00]" /> Direct UPI QR Settlements</li>
                </ul>
              </div>
              <button
                onClick={onOpenRegister}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all cursor-pointer"
              >
                Start Free Forever
              </button>
            </div>

            {/* Pro Plan */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#b84b00] text-white shadow-xl shadow-[#b84b00]/25 space-y-6 flex flex-col justify-between relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-300 text-slate-950 font-extrabold text-[10px] uppercase px-3 py-1 rounded-full shadow-sm">
                Most Popular for Shops
              </span>
              <div className="space-y-4">
                <h3 className="font-bold text-white text-lg">Monthly Pro</h3>
                <p className="text-xs text-amber-100">Busy cyber cafes &amp; college xerox shops</p>
                <div className="text-4xl font-extrabold text-white">
                  ₹49 <span className="text-xs font-normal text-amber-200">/ month</span>
                </div>
                <ul className="space-y-3 text-xs text-amber-50 pt-2 border-t border-amber-600/50">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-white" /> Unlimited Automated Prints</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-white" /> Smart Aadhaar &amp; ID Auto-Merge</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-white" /> 0% Platform Commission</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-white" /> Custom Rates Settings</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-white" /> Priority Phone/WhatsApp Support</li>
                </ul>
              </div>
              <button
                onClick={onOpenRegister}
                className="w-full py-3 rounded-xl bg-white hover:bg-amber-50 text-[#b84b00] font-extrabold text-xs shadow-md transition-all cursor-pointer"
              >
                Get Started Pro (₹49/mo)
              </button>
            </div>

            {/* Annual Plan */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-lg">Yearly Pro</h3>
                  <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Save ₹89</span>
                </div>
                <p className="text-xs text-slate-500">Best annual savings for established shops</p>
                <div className="text-4xl font-extrabold text-slate-950">
                  ₹499 <span className="text-xs font-normal text-slate-500">/ year</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#b84b00]" /> Everything in Monthly Pro</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#b84b00]" /> ₹89 Annual Discount (vs ₹49/mo)</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#b84b00]" /> Multi-Printer Dispatch (B&amp;W + Color)</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#b84b00]" /> Free Acrylic Standee Poster File</li>
                </ul>
              </div>
              <button
                onClick={onOpenRegister}
                className="w-full py-3 rounded-xl border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white font-bold text-xs transition-all cursor-pointer"
              >
                Get Annual Pass (₹499/yr)
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* 5. FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <section id="faq" className="py-16 sm:py-24 bg-slate-50 border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-6 sm:px-10">
          
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold text-[#b84b00] tracking-wider uppercase">Got Questions?</span>
            <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-sm text-slate-500">Everything you need to know about setting up Printo in your xerox shop.</p>
          </div>

          <div className="space-y-3.5">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                >
                  <span className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {faq.q}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform shrink-0 ${openFaq === idx ? 'bg-amber-100 text-[#b84b00] rotate-180' : 'bg-slate-100 text-slate-500'}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4 animate-in fade-in duration-200">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 6. CALL TO ACTION BANNER */}
      <section className="py-24 bg-slate-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-6 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            Ready to Automate Your Print Shop?
          </h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto">
            Setup takes less than 2 minutes. Get your customized counter standee poster and start printing automatically today.
          </p>
          <div className="pt-2">
            <button
              onClick={onOpenRegister}
              className="px-8 py-4 rounded-xl bg-[#b84b00] hover:bg-[#9f4000] text-white font-bold text-sm shadow-xl shadow-[#b84b00]/25 transition-all cursor-pointer inline-flex items-center justify-center"
            >
              Register Your Shop Free
            </button>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="py-10 bg-white border-t border-slate-100 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <img src="/printo-logo-transparent.png" alt="Printo" className="h-8 w-auto object-contain" />
          </div>
          <p className="text-xs text-slate-500 sm:text-right">
            © 2026 Printo Technologies. Made for Indian Cyber Cafes &amp; Xerox Hubs.
          </p>
        </div>
      </footer>

    </div>
  );
}
