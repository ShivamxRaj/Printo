import React, { useState, useEffect } from 'react';
import { 
  FileText, CreditCard, UploadCloud, Printer, CheckCircle, 
  Smartphone, ShieldCheck, ArrowRight, RefreshCw, Copy, ChevronRight,
  AlertCircle, Sparkles, HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { io } from 'socket.io-client';
import { API_BASE, SOCKET_URL } from '../config';

export default function CustomerView({ shopId = 'shivam' }) {
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('doc'); // 'doc' or 'id_card'
  
  // Doc upload state
  const [docFile, setDocFile] = useState(null);
  const [docPageCount, setDocPageCount] = useState(1);
  const [tempFileId, setTempFileId] = useState('');
  const [uploading, setUploading] = useState(false);

  // ID card upload state
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);

  // Print options
  const [colorMode, setColorMode] = useState('bw'); // 'bw' or 'color'
  const [sides, setSides] = useState('single'); // 'single' or 'double'
  const [copies, setCopies] = useState(1);
  const [pageRange, setPageRange] = useState('all');

  // Pricing
  const [calculation, setCalculation] = useState({ totalAmount: 0, breakdown: '' });

  // Payment & Order tracking
  const [currentOrder, setCurrentOrder] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Socket
  const [socket, setSocket] = useState(null);

  // 1. Fetch Shop details with Instant Cache (Fast 0ms loading)
  useEffect(() => {
    // A. Check local cache first for instant render
    const cacheKey = `printo_cached_shop_${shopId}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.name) {
          setShop(parsed);
          setLoading(false);
          document.title = `${parsed.name} — Self-Service Instant Print | Printo`;
        }
      }
    } catch (e) {}

    // B. Revalidate from server
    fetch(`${API_BASE}/api/shops/${shopId}`)
      .then(res => {
        if (!res.ok) throw new Error('Shop not found');
        return res.json();
      })
      .then(data => {
        if (!data || data.error || !data.name) {
          setShop(null);
        } else {
          setShop(data);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(data));
          } catch (e) {}
          if (data.name) {
            document.title = `${data.name} — Self-Service Instant Print | Printo`;
          }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load shop:', err);
        setLoading(false);
      });
  }, [shopId]);

  // 2. Initialize Socket connection for real-time tracking
  useEffect(() => {
    const s = io(SOCKET_URL);
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  // Listen to order updates when currentOrder changes
  useEffect(() => {
    if (!socket || !currentOrder?.id) return;

    socket.emit('join_order', currentOrder.id);

    socket.on('order_status', (updatedOrder) => {
      console.log('Received real-time order update:', updatedOrder);
      setCurrentOrder(updatedOrder);

      if (updatedOrder.printStatus === 'completed') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    });

    return () => {
      socket.off('order_status');
    };
  }, [socket, currentOrder?.id]);

  // Instant synchronous price calculation based strictly on real shop rates
  const calculateEstimate = (m, c, s, cp, p) => {
    if (!shop || !shop.rates) return { totalAmount: 0, breakdown: '' };
    const rates = shop.rates;
    const copyCount = Math.max(1, parseInt(cp) || 1);
    const isColor = c === 'color';

    if (m === 'id_card') {
      let singlePrice;
      if (isColor) {
        singlePrice = rates.idCard !== undefined ? Number(rates.idCard) : (rates.colorSingle !== undefined ? Number(rates.colorSingle) : 10);
      } else {
        singlePrice = rates.idCardBw !== undefined ? Number(rates.idCardBw) : (rates.bwSingle !== undefined ? Number(rates.bwSingle) : 5);
      }
      const total = singlePrice * copyCount;
      return {
        unitPrice: singlePrice,
        totalAmount: Math.max(total, rates.minOrder || 0),
        totalPages: 1,
        totalSheets: copyCount,
        breakdown: `${copyCount} ${copyCount === 1 ? 'copy' : 'copies'} (${isColor ? 'Color' : 'B&W'}) × ₹${singlePrice}`
      };
    }
    const pages = p || 1;
    const isDouble = s === 'double';
    let unitRate = 0;
    let totalSheets = 0;
    let rawAmount = 0;
    if (isDouble) {
      totalSheets = Math.ceil(pages / 2);
      unitRate = isColor ? (rates.colorDouble || 16) : (rates.bwDouble || 3);
      rawAmount = totalSheets * unitRate * copyCount;
    } else {
      totalSheets = pages;
      unitRate = isColor ? (rates.colorSingle || 10) : (rates.bwSingle || 2);
      rawAmount = pages * unitRate * copyCount;
    }
    const totalAmount = Math.max(rawAmount, rates.minOrder || 0);
    return {
      unitPrice: unitRate,
      totalAmount,
      totalPages: pages,
      totalSheets: totalSheets * copyCount,
      breakdown: `${pages} ${pages === 1 ? 'page' : 'pages'} (${isColor ? 'Color' : 'B&W'}, ${isDouble ? '2-Sides' : '1-Side'}) × ${copyCount} ${copyCount === 1 ? 'copy' : 'copies'}`
    };
  };

  // 3. Recalculate price INSTANTLY whenever options change (0ms delay)
  useEffect(() => {
    if (!shop) return;
    const calc = calculateEstimate(mode, colorMode, sides, copies, docPageCount);
    setCalculation(calc);
  }, [shop, mode, colorMode, copies, sides, docPageCount]);

  // Handle document file upload
  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setDocFile(file);
    setUploading(true);

    const formData = new FormData();
    formData.append('document', file);

    try {
      const res = await fetch(`${API_BASE}/api/orders/upload-doc`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setTempFileId(data.tempFileId);
        setDocPageCount(data.pageCount);
      } else {
        alert(data.error || 'Failed to process document');
      }
    } catch (err) {
      alert('Network error while uploading');
    } finally {
      setUploading(false);
    }
  };

  // Handle ID card upload & auto merge
  const handleIdCardMerge = async (front, back) => {
    if (!front || !back) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('front', front);
    formData.append('back', back);

    try {
      const res = await fetch(`${API_BASE}/api/orders/upload-id-card`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setTempFileId(data.tempFileId);
        setDocPageCount(1);
      } else {
        alert(data.error || 'Failed to merge ID card');
      }
    } catch (err) {
      alert('Network error merging ID cards');
    } finally {
      setUploading(false);
    }
  };

  const handleFrontChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFrontImage(file);
      setFrontPreview(URL.createObjectURL(file));
      if (backImage) handleIdCardMerge(file, backImage);
    }
  };

  const handleBackChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBackImage(file);
      setBackPreview(URL.createObjectURL(file));
      if (frontImage) handleIdCardMerge(frontImage, file);
    }
  };

  // Create order & show payment screen
  const handleProceedToPayment = async () => {
    if (!tempFileId) {
      alert('Please upload a document first');
      return;
    }

    setIsProcessingOrder(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: shop.id,
          tempFileId,
          fileName: mode === 'id_card' ? 'Aadhaar_ID_Merged.pdf' : (docFile?.name || 'Document.pdf'),
          docType: mode,
          colorMode,
          copies,
          sides,
          pageRange,
          pageCount: docPageCount
        })
      });

      const data = await res.json();
      if (res.ok) {
        setCurrentOrder(data.order);
        setPaymentData(data);
      } else {
        alert(data.error || 'Failed to create order');
      }
    } catch (err) {
      alert('Error creating order');
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const handleCopyUpi = () => {
    const upi = shop?.upiId;
    if (upi) {
      navigator.clipboard.writeText(upi);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2200);
    }
  };

  // Payment claim callback (Reports payment to counter queue safely)
  const handleConfirmPayment = async () => {
    if (!currentOrder) return;
    try {
      const claimRes = await fetch(`${API_BASE}/api/orders/${currentOrder.id}/claim-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const claimData = await claimRes.json();
      if (claimData.order) {
        setCurrentOrder(claimData.order);
      }
    } catch (err) {
      console.error('Payment claim failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#b84b00] animate-spin" />
          <p className="text-slate-600 font-medium text-xs">Connecting to printer shop...</p>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Shop Not Found</h2>
          <p className="text-slate-600 mt-2 text-sm">Please check the QR code or URL and try scanning again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      {/* Top Shop Banner - Fully Responsive for Mobile & Tablets */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-lg mx-auto px-3.5 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#b84b00] flex items-center justify-center text-white font-bold shrink-0 shadow-sm shadow-amber-900/20">
              <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">
                {shop?.name || 'Shivam'}
              </h1>
            </div>
          </div>
          <div className="shrink-0 flex items-center">
            <a href="/" title="Printo — Instant Self-Service Print" className="flex items-center">
              <img
                src="/printo-logo-transparent.png"
                alt="Printo Logo"
                className="h-7 sm:h-8 w-auto object-contain hover:opacity-90 transition-opacity"
              />
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-lg mx-auto p-4 space-y-4">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <a href="/" className="hover:text-[#b84b00] transition-colors">Printo</a>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-slate-800 font-semibold truncate">{shop?.name}</span>
        </nav>

        {/* ORDER IN PROGRESS / TRACKER MODAL */}
        {currentOrder ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
            <div className="text-center pb-2 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pickup / Reprint PIN</span>
              <div className="text-4xl font-black text-[#b84b00] tracking-widest my-1 font-mono">
                #{currentOrder.orderCode}
              </div>
              <p className="text-xs text-slate-500">Show this PIN to shopkeeper if any paper reprint is needed.</p>
            </div>

            {/* Status Stepper */}
            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentOrder.paymentStatus === 'paid' ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-700 animate-pulse'
                }`}>
                  {currentOrder.paymentStatus === 'paid' ? '✓' : '1'}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">
                    {currentOrder.paymentStatus === 'paid' 
                      ? 'Payment Verified & Released' 
                      : currentOrder.paymentClaimed 
                      ? 'Payment Reported (Ready at Counter)' 
                      : 'Awaiting Payment'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {currentOrder.paymentStatus === 'paid' 
                      ? 'Received via UPI' 
                      : currentOrder.paymentClaimed 
                      ? `Show PIN #${currentOrder.orderCode} at the counter` 
                      : `Total to pay: ₹${currentOrder.totalAmount}`}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentOrder.printStatus === 'completed' 
                    ? 'bg-emerald-500 text-white' 
                    : currentOrder.printStatus === 'printing' || currentOrder.printStatus === 'sent_to_printer'
                    ? 'bg-[#b84b00] text-white animate-spin'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  {currentOrder.printStatus === 'completed' ? '✓' : '2'}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">
                    {currentOrder.printStatus === 'completed' ? 'Printed Successfully!' :
                     currentOrder.printStatus === 'printing' ? 'Printing in progress...' :
                     currentOrder.printStatus === 'sent_to_printer' ? 'Spooling to shop printer...' :
                     'Waiting for printer spooler'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {currentOrder.printStatus === 'completed' 
                      ? 'Please pick up your fresh sheets from the printer tray!' 
                      : 'High-speed automated Windows spooler queue'}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Launcher if not yet paid */}
            {currentOrder.paymentStatus !== 'paid' && paymentData && (
              <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800 text-sm">Pay using any UPI app:</span>
                  <span className="font-bold text-[#b84b00] text-base">₹{currentOrder.totalAmount}</span>
                </div>

                {/* Copy UPI Box for Direct In-App Payment (Bypasses Bank Intent Blocks) */}
                <div className="bg-white p-2.5 rounded-lg border border-amber-200/80 flex items-center justify-between shadow-2xs">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block">Shop UPI ID</span>
                    <span className="text-xs font-mono font-bold text-slate-900 truncate block">{shop?.upiId || 'No UPI ID'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-[#b84b00] rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                  >
                    {copiedUpi ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy UPI</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 1-Tap Mobile UPI Intent Buttons with Official Logos */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={paymentData.intents.gpay}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs transition-all active:scale-98"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                    <span>Google Pay</span>
                  </a>
                  <a
                    href={paymentData.intents.phonepe}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs transition-all active:scale-98"
                  >
                    <svg className="w-4 h-4 shrink-0 rounded-full" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="24" fill="#5f259f"/>
                      <path fill="#ffffff" d="M33.6 16.2h-3.4c-.4 0-.8.2-1 .5l-6.8 9.6-3.8-4.5c-.3-.3-.7-.5-1.1-.5h-2.8c-.6 0-1 .7-.6 1.2l6.2 7.6c.5.6 1.4.6 1.9 0l8.9-12.7c.3-.5 0-1.2-.6-1.2z"/>
                      <path fill="#ffffff" d="M22.5 13.5v7.3l4.2-6c.2-.3.6-.5 1-.5h3.4c.5 0 .8.6.5 1l-7.7 11v8.2c0 .6-.4 1-1 1s-1-.4-1-1v-21c0-.6.4-1 1-1s1 .4 1 1z"/>
                    </svg>
                    <span>PhonePe</span>
                  </a>
                  <a
                    href={paymentData.intents.paytm}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs transition-all active:scale-98"
                  >
                    <svg className="w-5 h-3.5 shrink-0" viewBox="0 0 50 16" fill="none">
                      <text x="0" y="13" fill="#002970" fontSize="13" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif">Pay</text>
                      <text x="26" y="13" fill="#00baf2" fontSize="13" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif">tm</text>
                    </svg>
                    <span>Paytm</span>
                  </a>
                  <a
                    href={paymentData.intents.generic}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-[#b84b00] hover:bg-[#9f4000] text-white rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-98"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                      <path d="M4 14l8-10 2 6h6L12 20l2-6H4z" fill="#ffffff"/>
                    </svg>
                    <span>Other UPI</span>
                  </a>
                </div>

                {/* Fallback QR Code for cross-device scanning */}
                <div className="pt-2 text-center">
                  <p className="text-[11px] text-slate-500 mb-2">Or scan this QR code with any banking / UPI app:</p>
                  <img
                    src={paymentData.qrCodeDataUrl}
                    alt={`Dynamic UPI QR code for instant payment of rupees ${currentOrder.totalAmount} to ${shop.name}`}
                    className="w-36 h-36 mx-auto rounded-lg border border-slate-200 p-1 bg-white"
                  />
                </div>

                {/* Direct Verification Button or Waiting Card */}
                {currentOrder.paymentClaimed ? (
                  <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-3.5 text-center space-y-1.5 shadow-2xs">
                    <span className="text-xs font-bold text-amber-900 block flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                      Order Sent to Shop Counter Queue!
                    </span>
                    <p className="text-[11px] text-slate-600">
                      Please tell Pickup PIN <strong className="text-[#b84b00] font-mono font-black text-xs">#{currentOrder.orderCode}</strong> to the shopkeeper. Your fresh prints will be released instantly!
                    </p>
                  </div>
                ) : (
                  <div className="pt-2">
                    <button
                      onClick={handleConfirmPayment}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      I Have Paid ₹{currentOrder.totalAmount} • Get Pickup PIN
                    </button>
                    <p className="text-[10px] text-center text-slate-500 mt-1.5">
                      Sends your order to the counter queue. Show your PIN to collect your print.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Privacy auto-purge notice */}
            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Zero-Storage Guarantee: Your files are automatically purged from disk after printing.</span>
            </div>

            {/* Back button */}
            {currentOrder.printStatus === 'completed' && (
              <button
                onClick={() => {
                  setCurrentOrder(null);
                  setPaymentData(null);
                  setTempFileId('');
                  setDocFile(null);
                  setFrontImage(null);
                  setBackImage(null);
                }}
                className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl"
              >
                Print Another Document
              </button>
            )}
          </div>
        ) : (
          /* STEP 1 & 2: SELECTION & UPLOAD */
          <>
            {/* Mode Selector Tabs - Responsive & Brand Color */}
            <div className="grid grid-cols-2 bg-slate-200/80 p-1 rounded-xl text-xs font-bold text-slate-600 gap-1">
              <button
                type="button"
                onClick={() => setMode('doc')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                  mode === 'doc'
                    ? 'bg-white text-[#b84b00] shadow-xs font-black ring-1 ring-amber-300'
                    : 'hover:text-slate-900 text-slate-600'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0 text-[#b84b00]" />
                <span className="text-[11px] sm:text-xs font-bold">Document (PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('id_card')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                  mode === 'id_card'
                    ? 'bg-white text-[#b84b00] shadow-xs font-black ring-1 ring-amber-300'
                    : 'hover:text-slate-900 text-slate-600'
                }`}
              >
                <CreditCard className="w-4 h-4 shrink-0 text-[#b84b00]" />
                <span className="text-[11px] sm:text-xs font-bold">ID / Aadhaar</span>
              </button>
            </div>

            {/* MODE A: NORMAL DOCUMENT UPLOADER */}
            {mode === 'doc' ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">Upload Document</h3>
                  <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                    PDF, JPG, PNG
                  </span>
                </div>

                <label className={`block border-2 border-dashed rounded-2xl p-5 sm:p-6 text-center cursor-pointer transition-all ${
                  docFile ? 'border-emerald-400 bg-emerald-50/30' : 'border-amber-300 hover:border-[#b84b00] bg-amber-50/20'
                }`}>
                  <input
                    type="file"
                    accept=".pdf,image/*,.docx,.doc"
                    onChange={handleDocUpload}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-[#b84b00] shadow-xs">
                      {uploading ? <RefreshCw className="w-6 h-6 animate-spin text-[#b84b00]" /> : <UploadCloud className="w-6 h-6 text-[#b84b00]" />}
                    </div>
                    {docFile ? (
                      <div className="w-full max-w-[280px] sm:max-w-xs mx-auto px-1">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 rounded-xl shadow-2xs max-w-full">
                          <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-bold text-slate-800 text-xs truncate block max-w-[200px] sm:max-w-[230px]" title={docFile.name}>
                            {docFile.name}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-700 font-bold mt-1.5 flex items-center justify-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{docPageCount} {docPageCount === 1 ? 'Page' : 'Pages'} detected</span>
                          {docFile.size ? (
                            <span className="text-slate-400 font-medium ml-1">
                              • {(docFile.size / 1024).toFixed(0)} KB
                            </span>
                          ) : null}
                        </p>
                        <span className="inline-block text-[10px] text-slate-400 font-medium hover:text-[#b84b00] mt-1 transition-colors">
                          Tap to change file
                        </span>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">Tap here to choose file</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">or drag and drop your document</p>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            ) : (
              /* MODE B: SMART AADHAAR / ID CARD AUTO-MERGER */
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-sm">Smart ID / Aadhaar Auto-Merge</h3>
                      <span className="text-[10px] bg-amber-100 text-[#b84b00] font-bold px-2 py-0.5 rounded-full shrink-0">
                        Auto-Stitch
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Upload both sides. We auto-align them on a single A4 page.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Front Side */}
                  <label className="block border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-xl p-3 text-center cursor-pointer bg-slate-50/50">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFrontChange}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-1.5">
                      {frontPreview ? (
                        <img src={frontPreview} alt="Front side photograph of identification card" className="w-full h-24 object-cover rounded-lg border border-slate-200" />
                      ) : (
                        <div className="w-full h-24 rounded-lg bg-amber-50/60 flex flex-col items-center justify-center text-[#b84b00]">
                          <CreditCard className="w-6 h-6 mb-1" />
                          <span className="text-[11px] font-semibold text-slate-700">1. Front Photo</span>
                        </div>
                      )}
                      <span className="text-[10px] text-[#b84b00] font-bold">
                        {frontPreview ? 'Change Front' : 'Upload Front'}
                      </span>
                    </div>
                  </label>

                  {/* Back Side */}
                  <label className="block border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-xl p-3 text-center cursor-pointer bg-slate-50/50">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleBackChange}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-1.5">
                      {backPreview ? (
                        <img src={backPreview} alt="Back side photograph of identification card" className="w-full h-24 object-cover rounded-lg border border-slate-200" />
                      ) : (
                        <div className="w-full h-24 rounded-lg bg-amber-50/60 flex flex-col items-center justify-center text-[#b84b00]">
                          <CreditCard className="w-6 h-6 mb-1" />
                          <span className="text-[11px] font-semibold text-slate-700">2. Back Photo</span>
                        </div>
                      )}
                      <span className="text-[10px] text-[#b84b00] font-bold">
                        {backPreview ? 'Change Back' : 'Upload Back'}
                      </span>
                    </div>
                  </label>
                </div>

                {uploading && (
                  <div className="flex items-center justify-center gap-2 py-2 text-[#b84b00] text-xs font-semibold">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Auto-aligning ID Card to A4 sheet...</span>
                  </div>
                )}

                {tempFileId && !uploading && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Front & Back merged into single A4 print ready format!</span>
                  </div>
                )}
              </div>
            )}

            {/* PRINT SETTINGS OPTIONS CARD */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Print Configuration</h3>

              {/* Color Mode */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Color Preference</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setColorMode('bw')}
                    className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      colorMode === 'bw'
                        ? 'border-[#b84b00] bg-amber-50/80 text-[#b84b00] ring-1 ring-[#b84b00]'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-900 inline-block"></span>
                      <span>Black & White</span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500">
                      ₹{mode === 'id_card' ? (shop?.rates?.idCardBw || shop?.rates?.bwSingle || 5) : (shop?.rates?.bwSingle || 2)}/page
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorMode('color')}
                    className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      colorMode === 'color'
                        ? 'border-[#b84b00] bg-amber-50/80 text-[#b84b00] ring-1 ring-[#b84b00]'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-[#b84b00] inline-block"></span>
                      <span>Full Color</span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500">
                      ₹{mode === 'id_card' ? (shop?.rates?.idCard || shop?.rates?.colorSingle || 10) : (shop?.rates?.colorSingle || 10)}/page
                    </span>
                  </button>
                </div>
              </div>

              {/* Sides (Single vs Double) */}
              {mode === 'doc' && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Print Sides</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSides('single')}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                        sides === 'single'
                          ? 'border-[#b84b00] bg-amber-50/80 text-[#b84b00] ring-1 ring-[#b84b00]'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <span>Single-Sided (1 Side)</span>
                      <span className="text-[11px] font-medium text-slate-500">
                        ₹{colorMode === 'color' ? (shop?.rates?.colorSingle || 10) : (shop?.rates?.bwSingle || 2)}/page
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSides('double')}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                        sides === 'double'
                          ? 'border-[#b84b00] bg-amber-50/80 text-[#b84b00] ring-1 ring-[#b84b00]'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <span>Double-Sided (Both Sides)</span>
                      <span className="text-[11px] font-medium text-slate-500">
                        ₹{colorMode === 'color' ? (shop?.rates?.colorDouble || 16) : (shop?.rates?.bwDouble || 3)}/sheet
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Number of Copies */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-slate-600">Number of Copies</span>
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setCopies(Math.max(1, copies - 1))}
                    className="w-8 h-8 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-bold text-xs text-slate-900">{copies}</span>
                  <button
                    type="button"
                    onClick={() => setCopies(copies + 1)}
                    className="w-8 h-8 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* LIVE BILL SUMMARY CARD */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium">Estimated Bill</span>
                  <p className="text-xs text-slate-300">{calculation.breakdown || 'Upload document to calculate'}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Total</span>
                  <div className="text-2xl font-black text-emerald-400">
                    ₹{calculation.totalAmount || 0}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!tempFileId || isProcessingOrder}
                onClick={handleProceedToPayment}
                className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all ${
                  tempFileId && !isProcessingOrder
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isProcessingOrder ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating UPI Intent...
                  </>
                ) : (
                  <>
                    <span>Pay ₹{calculation.totalAmount || 0} & Print Automatically</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </>
        )}

      </main>
    </div>
  );
}


