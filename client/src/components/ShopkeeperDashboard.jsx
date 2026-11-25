import React, { useState, useEffect } from 'react';
import { 
  Printer, TrendingUp, IndianRupee, Layers, Settings, 
  RefreshCw, CheckCircle, Clock, AlertTriangle, QrCode, 
  ExternalLink, Shield, Power, Play, Download, PlusCircle, Store,
  Lock
} from 'lucide-react';
import { io } from 'socket.io-client';
import { API_BASE, SOCKET_URL } from '../config';

export default function ShopkeeperDashboard({ shopId = 'shivam', onOpenRegisterModal, onOpenAccessModal }) {
  const urlParams = new URLSearchParams(window.location.search);
  const effectiveShopId = urlParams.get('shop') || shopId || localStorage.getItem('printo_shopId') || 'shivam';

  const [shop, setShop] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agentStatus, setAgentStatus] = useState('offline');
  const [activePrinter, setActivePrinter] = useState('');
  const [isSavingRates, setIsSavingRates] = useState(false);
  const [reprintModalOrder, setReprintModalOrder] = useState(null);
  const [reprintCode, setReprintCode] = useState('');
  const [claimedAlertOrder, setClaimedAlertOrder] = useState(null);

  // Editable Rates State
  const [rates, setRates] = useState({
    bwSingle: 2,
    bwDouble: 3,
    colorSingle: 10,
    colorDouble: 16,
    idCardBw: 5,
    idCard: 10,
    minOrder: 1
  });
  const [upiId, setUpiId] = useState('');
  const [shopName, setShopName] = useState('');

  // Socket
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.emit('join_shop', effectiveShopId);

    socket.on('agent_status', (data) => {
      console.log('Agent status update:', data);
      setAgentStatus(data.status);
      if (data.activePrinter) setActivePrinter(data.activePrinter);
    });

    socket.on('order_created', (newOrder) => {
      setOrders(prev => [newOrder, ...prev]);
    });

    socket.on('order_claimed', (claimedOrder) => {
      setClaimedAlertOrder(claimedOrder);
      setOrders(prev => prev.map(o => o.id === claimedOrder.id ? claimedOrder : o));
    });

    socket.on('order_updated', (updated) => {
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    });

    return () => {
      socket.disconnect();
    };
  }, [effectiveShopId]);

  // Load Initial Data directly (0-friction, no PIN)
  const fetchData = async () => {
    setLoading(true);
    try {
      const [shopRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE}/api/shops/${effectiveShopId}`),
        fetch(`${API_BASE}/api/shops/${effectiveShopId}/orders`)
      ]);

      const shopData = await shopRes.json();
      const ordersData = await ordersRes.json();

      setShop(shopData);
      setShopName(shopData.name || '');
      document.title = `Shop Dashboard — ${shopData.name || 'Admin'} | Printo`;
      setUpiId(shopData.upiId || '');
      if (shopData.rates) setRates(shopData.rates);
      setAgentStatus(shopData.status || 'offline');
      if (shopData.activePrinter) setActivePrinter(shopData.activePrinter);
      if (Array.isArray(ordersData)) {
        setOrders(ordersData);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [effectiveShopId]);

  // Save Settings / Rates (UPI is frozen and protected)
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSavingRates(true);

    try {
      const res = await fetch(`${API_BASE}/api/shops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: effectiveShopId,
          name: shopName,
          rates: {
            bwSingle: parseFloat(rates.bwSingle) || 2,
            bwDouble: parseFloat(rates.bwDouble) || 3,
            colorSingle: parseFloat(rates.colorSingle) || 10,
            colorDouble: parseFloat(rates.colorDouble) || 16,
            idCardBw: parseFloat(rates.idCardBw) || 5,
            idCard: parseFloat(rates.idCard) || 10,
            minOrder: parseFloat(rates.minOrder) || 1
          }
        })
      });

      if (res.ok) {
        alert('✓ Shop settings and printing rates updated successfully!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save settings.');
      }
    } catch (err) {
      alert('Network error saving settings');
    } finally {
      setIsSavingRates(false);
    }
  };

  // Manually mark pending order as paid (cash received / direct UPI)
  const handleMarkPaid = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/verify-payment`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ transactionId: 'MANUAL_' + Date.now() })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.order) {
        setOrders(prev => prev.map(o => o.id === orderId ? data.order : o));
        if (claimedAlertOrder?.id === orderId) {
          setClaimedAlertOrder(null);
        }
      } else if (data.alreadyPaid && data.order) {
        setOrders(prev => prev.map(o => o.id === orderId ? data.order : o));
        if (claimedAlertOrder?.id === orderId) {
          setClaimedAlertOrder(null);
        }
      } else {
        alert(data.error || 'Payment verification failed');
      }
    } catch (err) {
      alert('Error updating payment status');
    }
  };

  // Trigger Reprint
  const handleTriggerReprint = async () => {
    if (!reprintModalOrder) return;
    try {
      const res = await fetch(`${API_BASE}/api/orders/${reprintModalOrder.id}/reprint`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ orderCode: reprintCode })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✓ Reprint command sent to ${activePrinter || 'printer'}!`);
        setReprintModalOrder(null);
        setReprintCode('');
      } else {
        alert(data.error || 'Reprint failed');
      }
    } catch (err) {
      alert('Error triggering reprint');
    }
  };

  // Calculate quick metrics
  const totalRevenue = orders
    .filter(o => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const totalSheetsPrinted = orders
    .filter(o => o.printStatus === 'completed')
    .reduce((sum, o) => sum + (o.totalSheets || 1), 0);

  const paidOrdersCount = orders.filter(o => o.paymentStatus === 'paid').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <RefreshCw className="w-8 h-8 text-[#b84b00] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* Top Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#b84b00] flex items-center justify-center text-white font-bold shadow-md shadow-amber-900/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-white">{shopName}</h1>
                <span className="text-[11px] font-semibold bg-slate-800 text-amber-400 px-2 py-0.5 rounded border border-slate-700">
                  Shop Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">UPI VPA: <span className="text-emerald-400 font-mono">{upiId}</span></p>
            </div>
          </div>

          {/* Desktop Agent Connectivity Badge & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              agentStatus === 'online'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                : 'bg-rose-950/80 text-rose-300 border-rose-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${agentStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span>
                {agentStatus === 'online' 
                  ? `Agent Online (${activePrinter || 'Connected'})`
                  : 'Agent Offline'}
              </span>
            </div>

            <a
              href={`${API_BASE}/api/shops/${effectiveShopId}/download-launcher`}
              download={`start-${effectiveShopId}-agent.bat`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700"
              title="Download 1-click agent launcher for this shop"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Download Agent (.bat)</span>
            </a>

            <a
              href={`/standee/${effectiveShopId}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#b84b00] hover:bg-[#9f4000] text-white text-xs font-bold transition-all shadow-sm"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Print Standee</span>
            </a>

            {onOpenRegisterModal && (
              <button
                onClick={onOpenRegisterModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Register New Shop</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto p-4 space-y-6">

        {/* Live Customer Claim Notification Toast */}
        {claimedAlertOrder && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-xs">Customer Reported UPI Payment!</h4>
                <p className="text-[11px] opacity-90">
                  Order #{claimedAlertOrder.orderCode} (₹{claimedAlertOrder.totalAmount}) is waiting for verification.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleMarkPaid(claimedAlertOrder.id)}
              className="bg-white text-slate-900 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs hover:bg-slate-100 cursor-pointer"
            >
              Verify & Release Print
            </button>
          </div>
        )}

        {/* Connection Status Banner */}
        {agentStatus === 'offline' ? (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#b84b00] flex items-center justify-center shrink-0">
                  <Printer className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 text-sm">Automated Hands-Free Printing is Inactive</h3>
                  <p className="text-xs text-slate-600 max-w-xl">
                    Run the 1-click Windows connector on this PC so that pages automatically come out of your printer as soon as a customer pays.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={`${API_BASE}/api/shops/${effectiveShopId}/download-launcher`}
                  download={`start-${effectiveShopId}-agent.bat`}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#b84b00] hover:bg-[#9f4000] text-white font-bold text-xs shadow-sm transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download 1-Click Connector</span>
                </a>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-amber-200/60 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-[10px] font-bold">1</span>
                Download file
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-[10px] font-bold">2</span>
                Double-click to start
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-4 h-4 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px] font-bold">✓</span>
                Zero setup: All printers detected automatically!
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Automated Hands-Free Printing Active</h4>
                <p className="text-[11px] text-slate-600">
                  Ready to print on <span className="font-bold text-emerald-800">"{activePrinter || 'Connected Printer'}"</span>. Pages print automatically upon customer payment!
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live & Ready
            </span>
          </div>
        )}

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Today's Revenue</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">₹{totalRevenue}</h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">Direct to your bank UPI</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Paid Print Jobs</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{paidOrdersCount}</h3>
              <p className="text-[11px] text-slate-500 mt-1">Walk-in customer orders</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#b84b00] flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Sheets Printed</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{totalSheetsPrinted}</h3>
              <p className="text-[11px] text-slate-500 mt-1">Paper consumed</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* TWO COLUMN GRID: RATES SETTINGS & LIVE ORDERS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: PRICING & SETTINGS CONFIG */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4 h-fit">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Settings className="w-4 h-4 text-slate-700" />
              <h2 className="font-bold text-slate-900 text-sm">Pricing & Shop Rates</h2>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Shop Name</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 border border-slate-200 rounded-lg focus:outline-[#b84b00]"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Settlement UPI ID</span>
                  </label>
                  <a
                    href={`mailto:support@getprinto.in?subject=Request%20to%20update%20Shop%20UPI%20ID%20(${effectiveShopId})&body=Hi%20Printo%20Support,%0A%0APlease%20update%20the%20UPI%20ID%20for%20my%20shop:%0AShop%20ID:%20${effectiveShopId}%0ACurrent%20UPI:%20${upiId}%0ANew%20UPI%20ID:%20%0A%0AThank%20you.`}
                    className="text-[10px] text-[#b84b00] underline font-bold"
                  >
                    Need Support
                  </a>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={upiId}
                    readOnly
                    disabled
                    className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg cursor-not-allowed select-all"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                    ✓ Verified Bank VPA
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Customer payments go directly to this bank account. Locked to protect against unauthorized changes.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">B&W 1-Side (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={rates.bwSingle}
                    onChange={(e) => setRates({ ...rates, bwSingle: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-[#b84b00]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">B&W 2-Sides (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={rates.bwDouble}
                    onChange={(e) => setRates({ ...rates, bwDouble: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-[#b84b00]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Color 1-Side (₹)</label>
                  <input
                    type="number"
                    step="1"
                    value={rates.colorSingle}
                    onChange={(e) => setRates({ ...rates, colorSingle: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-[#b84b00]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Color 2-Sides (₹)</label>
                  <input
                    type="number"
                    step="1"
                    value={rates.colorDouble}
                    onChange={(e) => setRates({ ...rates, colorDouble: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-[#b84b00]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">ID Card B&W (₹)</label>
                  <input
                    type="number"
                    step="1"
                    value={rates.idCardBw || 5}
                    onChange={(e) => setRates({ ...rates, idCardBw: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-[#b84b00]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">ID Card Color (₹)</label>
                  <input
                    type="number"
                    step="1"
                    value={rates.idCard}
                    onChange={(e) => setRates({ ...rates, idCard: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-[#b84b00]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Min Order (₹)</label>
                  <input
                    type="number"
                    step="1"
                    value={rates.minOrder}
                    onChange={(e) => setRates({ ...rates, minOrder: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-[#b84b00]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingRates}
                className="w-full py-2 bg-[#b84b00] hover:bg-[#9f4000] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {isSavingRates ? 'Saving Rates...' : 'Save Updated Rates'}
              </button>
            </form>
          </div>

          {/* RIGHT: LIVE ORDERS QUEUE */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-700" />
                <h2 className="font-bold text-slate-900 text-sm">Live Order Queue & Print Logs</h2>
              </div>
              <button
                onClick={fetchData}
                className="text-xs text-[#b84b00] hover:text-[#9f4000] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Printer className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">No print orders yet today</p>
                <p className="text-xs text-slate-500 mt-1">Walk-in customers will appear here the moment they scan your QR code.</p>
              </div>
            ) : (
              <>
                {/* MOBILE VIEW: Clean, organized order cards */}
                <div className="md:hidden space-y-3">
                  {orders.map((o) => (
                    <div key={o.id} className="p-3.5 bg-slate-50/80 hover:bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                      {/* Top Header: PIN, Badge, Amount & Payment */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-amber-100/80 text-[#b84b00] px-2.5 py-0.5 rounded-md border border-amber-200">
                            #{o.orderCode}
                          </span>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">
                            {o.docType === 'id_card' ? 'Smart ID' : 'Doc'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900">₹{o.totalAmount}</span>
                          {o.paymentStatus === 'paid' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              ✓ PAID
                            </span>
                          ) : o.paymentClaimed ? (
                            <button
                              onClick={() => handleMarkPaid(o.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer animate-pulse"
                              title="Customer claimed payment! Verify Soundbox & click to print"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Verify & Print</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMarkPaid(o.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 hover:bg-emerald-600 text-amber-900 hover:text-white border border-amber-300 transition-all cursor-pointer"
                              title="Click to mark as Paid"
                            >
                              <span>PENDING</span>
                              <span className="text-[9px] underline font-normal">Mark Paid</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Middle: File Name & Spec Details */}
                      <div className="text-xs">
                        <p className="font-semibold text-slate-800 truncate" title={o.fileName}>
                          {o.fileName}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <span className="font-medium text-slate-700">{o.totalPages}p × {o.copies}c</span>
                          <span>•</span>
                          <span className="capitalize">{o.colorMode === 'color' ? 'Color' : 'B&W'}</span>
                          <span>•</span>
                          <span className="capitalize">{o.sides}</span>
                        </div>
                      </div>

                      {/* Footer: Printer Status & Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-xs">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          o.printStatus === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                          o.printStatus === 'printing' ? 'bg-amber-100 text-[#b84b00] animate-pulse' :
                          o.printStatus === 'sent_to_printer' ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-200/70 text-slate-600'
                        }`}>
                          {o.printStatus}
                        </span>

                        <div className="flex items-center gap-2">
                          {o.fileUrl && (
                            <a
                              href={o.fileUrl.startsWith('http') ? o.fileUrl : `${API_BASE}${o.fileUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[#b84b00] font-bold rounded-lg transition-all text-[11px] inline-flex items-center gap-1 border border-amber-200/60"
                              title="Open document in browser to view or print manually"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Print</span>
                            </a>
                          )}
                          <button
                            onClick={() => {
                              setReprintModalOrder(o);
                              setReprintCode(o.orderCode);
                            }}
                            className="px-2.5 py-1 bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-all text-[11px] cursor-pointer"
                          >
                            Reprint
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* DESKTOP VIEW: Full Structured Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[650px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 font-semibold">
                        <th className="pb-2.5">PIN / Order</th>
                        <th className="pb-2.5">Document</th>
                        <th className="pb-2.5">Details</th>
                        <th className="pb-2.5">Amount</th>
                        <th className="pb-2.5">Payment</th>
                        <th className="pb-2.5">Printer Status</th>
                        <th className="pb-2.5 text-right">Reprint</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.map((o) => (
                        <tr key={o.id} className="hover:bg-slate-50/60">
                          <td className="py-3 font-mono font-bold text-[#b84b00]">
                            #{o.orderCode}
                          </td>
                          <td className="py-3">
                            <p className="font-semibold text-slate-800 max-w-[140px] truncate">{o.fileName}</p>
                            <span className="text-[10px] text-slate-400 uppercase">{o.docType === 'id_card' ? 'Smart ID Card' : 'Standard Doc'}</span>
                          </td>
                          <td className="py-3 text-slate-600">
                            <span>{o.totalPages}p × {o.copies}c</span>
                            <span className="text-[10px] text-slate-400 block">{o.colorMode === 'color' ? 'Color' : 'B&W'} • {o.sides}</span>
                          </td>
                          <td className="py-3 font-bold text-slate-900">
                            ₹{o.totalAmount}
                          </td>
                          <td className="py-3">
                            {o.paymentStatus === 'paid' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                ✓ PAID
                              </span>
                            ) : o.paymentClaimed ? (
                              <button
                                onClick={() => handleMarkPaid(o.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer animate-pulse"
                                title="Customer claimed payment! Verify Soundbox & click to print"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Verify & Print</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMarkPaid(o.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 hover:bg-emerald-600 text-amber-900 hover:text-white border border-amber-300 hover:border-emerald-600 transition-all cursor-pointer"
                                title="Click to mark as Paid (Cash / Direct UPI received)"
                              >
                                <span>PENDING</span>
                                <span className="text-[9px] underline">Mark Paid</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              o.printStatus === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                              o.printStatus === 'printing' ? 'bg-amber-100 text-[#b84b00] animate-pulse' :
                              o.printStatus === 'sent_to_printer' ? 'bg-amber-50 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {o.printStatus}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {o.fileUrl && (
                                <a
                                  href={o.fileUrl.startsWith('http') ? o.fileUrl : `${API_BASE}${o.fileUrl}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-[#b84b00] font-bold rounded-lg transition-all text-[11px] inline-flex items-center gap-1"
                                  title="Open document in browser to view or print manually"
                                >
                                  <Printer className="w-3 h-3" />
                                  <span>Print</span>
                                </a>
                              )}
                              <button
                                onClick={() => {
                                  setReprintModalOrder(o);
                                  setReprintCode(o.orderCode);
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all text-[11px] cursor-pointer"
                              >
                                Reprint
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

      </main>

      {/* REPRINT CONFIRMATION MODAL */}
      {reprintModalOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Confirm Paper Reprint</h3>
            <p className="text-xs text-slate-600">
              Re-send order <span className="font-mono font-bold text-[#b84b00]">#{reprintModalOrder.orderCode}</span> ({reprintModalOrder.fileName}) to the printer? No extra payment will be charged.
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Verify 4-Digit Order Code:</label>
              <input
                type="text"
                value={reprintCode}
                onChange={(e) => setReprintCode(e.target.value)}
                className="w-full text-center text-lg font-mono font-bold tracking-widest px-3 py-2 border border-slate-200 rounded-lg focus:outline-[#b84b00]"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReprintModalOrder(null)}
                className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerReprint}
                className="w-1/2 py-2 bg-[#b84b00] hover:bg-[#9f4000] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Send to Printer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


