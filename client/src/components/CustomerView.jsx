import React, { useState, useEffect } from 'react';
import { 
  FileText, CreditCard, UploadCloud, Printer, CheckCircle, 
  Smartphone, ShieldCheck, ArrowRight, RefreshCw, Copy, ChevronRight,
  AlertCircle, Sparkles, HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { io } from 'socket.io-client';

export default function CustomerView({ shopId = 'demo-shop' }) {
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

  // Socket
  const [socket, setSocket] = useState(null);

  // 1. Fetch Shop details
  useEffect(() => {
    fetch(`/api/shops/${shopId}`)
      .then(res => res.json())
      .then(data => {
        setShop(data);
        setLoading(false);
        if (data?.name) {
          document.title = `${data.name} — Self-Service Instant Print | Printo`;
        }
      })
      .catch(err => {
        console.error('Failed to load shop:', err);
        setLoading(false);
      });
  }, [shopId]);

  // 2. Initialize Socket connection for real-time tracking
  useEffect(() => {
    const s = io();
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

  // 3. Recalculate price whenever options change
  useEffect(() => {
    if (!shop || !tempFileId) return;

    fetch('/api/orders/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopId: shop.id,
        docType: mode,
        colorMode,
        copies,
        sides,
        pageCount: docPageCount
      })
    })
      .then(res => res.json())
      .then(data => setCalculation(data))
      .catch(err => console.error('Calculation error:', err));
  }, [shop, tempFileId, mode, colorMode, copies, sides, docPageCount]);

  // Handle document file upload
  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setDocFile(file);
    setUploading(true);

    const formData = new FormData();
    formData.append('document', file);

    try {
      const res = await fetch('/api/orders/upload-doc', {
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
      const res = await fetch('/api/orders/upload-id-card', {
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
      const res = await fetch('/api/orders/create', {
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

  // Simulate payment callback (in production, bank webhook triggers this)
  const handleConfirmPayment = async () => {
    if (!currentOrder) return;
    try {
      const res = await fetch(`/api/orders/${currentOrder.id}/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: 'UPI_SIM_' + Date.now() })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentOrder(data.order);
      }
    } catch (err) {
      console.error('Payment verification failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-slate-600 font-medium">Connecting to printer shop...</p>
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
      {/* Top Shop Banner */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-base leading-tight flex items-center gap-1.5">
                {shop.name}
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              </h1>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <span>Self-Service Smart Print</span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.2 rounded">Printer Ready</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              UPI Direct
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-lg mx-auto p-4 space-y-4">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <a href="/" className="hover:text-blue-600 transition-colors">Home</a>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <a href="/dashboard" className="hover:text-blue-600 transition-colors">Shops</a>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-slate-800 font-semibold truncate">{shop.name}</span>
        </nav>

        {/* ORDER IN PROGRESS / TRACKER MODAL */}
        {currentOrder ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
            <div className="text-center pb-2 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pickup / Reprint PIN</span>
              <div className="text-4xl font-black text-indigo-600 tracking-widest my-1 font-mono">
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
                    {currentOrder.paymentStatus === 'paid' ? 'Payment Verified' : 'Awaiting Payment'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {currentOrder.paymentStatus === 'paid' ? 'Received via UPI' : `Total to pay: ₹${currentOrder.totalAmount}`}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentOrder.printStatus === 'completed' 
                    ? 'bg-emerald-500 text-white' 
                    : currentOrder.printStatus === 'printing' || currentOrder.printStatus === 'sent_to_printer'
                    ? 'bg-indigo-600 text-white animate-spin'
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
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800 text-sm">Pay using any UPI app:</span>
                  <span className="font-bold text-indigo-700 text-base">₹{currentOrder.totalAmount}</span>
                </div>

                {/* 1-Tap Mobile UPI Intent Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={paymentData.intents.gpay}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs"
                  >
                    <span>🔵</span> Google Pay
                  </a>
                  <a
                    href={paymentData.intents.phonepe}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs"
                  >
                    <span>🟣</span> PhonePe
                  </a>
                  <a
                    href={paymentData.intents.paytm}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs"
                  >
                    <span>🔷</span> Paytm
                  </a>
                  <a
                    href={paymentData.intents.generic}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs"
                  >
                    <span>⚡</span> Other UPI
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

                {/* Direct Verification Button */}
                <div className="pt-2">
                  <button
                    onClick={handleConfirmPayment}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all"
                  >
                    <CheckCircle className="w-4 h-4" />
                    I Have Paid ₹{currentOrder.totalAmount} (Auto-Verify & Print)
                  </button>
                  <p className="text-[10px] text-center text-slate-500 mt-1.5">
                    Clicking confirms payment with the shopkeeper's account & triggers instant printing.
                  </p>
                </div>
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
            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 bg-slate-200/80 p-1 rounded-xl text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setMode('doc')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all ${
                  mode === 'doc' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                Normal Document (PDF/Photo)
              </button>
              <button
                type="button"
                onClick={() => setMode('id_card')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all ${
                  mode === 'id_card' ? 'bg-white text-indigo-700 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Smart Aadhaar / ID Card
              </button>
            </div>

            {/* MODE A: NORMAL DOCUMENT UPLOADER */}
            {mode === 'doc' ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">Upload Document</h3>
                  <span className="text-[11px] text-slate-500">PDF, JPG, PNG, DOCX</span>
                </div>

                <label className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  docFile ? 'border-emerald-400 bg-emerald-50/30' : 'border-indigo-200 hover:border-indigo-400 bg-indigo-50/20'
                }`}>
                  <input
                    type="file"
                    accept=".pdf,image/*,.docx,.doc"
                    onChange={handleDocUpload}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      {uploading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <UploadCloud className="w-6 h-6" />}
                    </div>
                    {docFile ? (
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{docFile.name}</p>
                        <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                          ✓ {docPageCount} {docPageCount === 1 ? 'Page' : 'Pages'} detected
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-indigo-900 text-sm">Tap here to choose file</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">or drag and drop your document</p>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            ) : (
              /* MODE B: SMART AADHAAR / ID CARD AUTO-MERGER */
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Smart ID / Aadhaar Auto-Merge</h3>
                    <p className="text-[11px] text-slate-500">Upload both sides. We auto-align them on a single A4 page.</p>
                  </div>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                    Auto-Stitch
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Front Side */}
                  <label className="block border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-3 text-center cursor-pointer bg-slate-50/50">
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
                        <div className="w-full h-24 rounded-lg bg-indigo-50/60 flex flex-col items-center justify-center text-indigo-500">
                          <CreditCard className="w-6 h-6 mb-1" />
                          <span className="text-[11px] font-semibold text-slate-700">1. Front Photo</span>
                        </div>
                      )}
                      <span className="text-[10px] text-indigo-600 font-bold">
                        {frontPreview ? 'Change Front' : 'Upload Front'}
                      </span>
                    </div>
                  </label>

                  {/* Back Side */}
                  <label className="block border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-3 text-center cursor-pointer bg-slate-50/50">
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
                        <div className="w-full h-24 rounded-lg bg-indigo-50/60 flex flex-col items-center justify-center text-indigo-500">
                          <CreditCard className="w-6 h-6 mb-1" />
                          <span className="text-[11px] font-semibold text-slate-700">2. Back Photo</span>
                        </div>
                      )}
                      <span className="text-[10px] text-indigo-600 font-bold">
                        {backPreview ? 'Change Back' : 'Upload Back'}
                      </span>
                    </div>
                  </label>
                </div>

                {uploading && (
                  <div className="flex items-center justify-center gap-2 py-2 text-indigo-600 text-xs font-semibold">
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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Print Configuration</h3>

              {/* Color Mode */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Color Preference</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setColorMode('bw')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      colorMode === 'bw'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-slate-900 inline-block"></span>
                    Black & White (₹{shop.rates?.bwSingle}/page)
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorMode('color')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      colorMode === 'color'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-indigo-500 inline-block"></span>
                    Full Color (₹{shop.rates?.colorSingle}/page)
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
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        sides === 'single'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      Single-Sided (1 Side)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSides('double')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        sides === 'double'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      Double-Sided (Both Sides)
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
                    className="w-8 h-8 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-bold text-xs text-slate-900">{copies}</span>
                  <button
                    type="button"
                    onClick={() => setCopies(copies + 1)}
                    className="w-8 h-8 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200"
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

