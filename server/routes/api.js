const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const db = require('../db');
const pdfService = require('../services/pdfService');

// Setup upload storage
const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const memoryStorage = multer.memoryStorage();
const upload = multer({
  storage: memoryStorage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Helper to calculate pricing based on shop rates
function calculatePrice(shop, { docType, colorMode, copies, sides, pageCount, selectedPagesCount }) {
  const rates = shop.rates || {};
  const copyCount = Math.max(1, parseInt(copies) || 1);

  if (docType === 'id_card') {
    const singlePrice = rates.idCard !== undefined ? Number(rates.idCard) : 10;
    const total = singlePrice * copyCount;
    const minOrder = rates.minOrder !== undefined ? Number(rates.minOrder) : 1;
    return {
      unitPrice: singlePrice,
      totalAmount: Math.max(total, minOrder),
      totalPages: 1,
      totalSheets: 1 * copyCount,
      breakdown: `${copyCount} copy x ₹${singlePrice}`
    };
  }

  const activePages = selectedPagesCount || pageCount || 1;
  const isColor = colorMode === 'color';
  const isDouble = sides === 'double';

  let unitRate = 0;
  let totalSheets = 0;
  let rawAmount = 0;

  if (isDouble) {
    totalSheets = Math.ceil(activePages / 2);
    unitRate = isColor 
      ? (rates.colorDouble !== undefined ? Number(rates.colorDouble) : 16) 
      : (rates.bwDouble !== undefined ? Number(rates.bwDouble) : 3);
    rawAmount = totalSheets * unitRate * copyCount;
  } else {
    totalSheets = activePages;
    unitRate = isColor 
      ? (rates.colorSingle !== undefined ? Number(rates.colorSingle) : 10) 
      : (rates.bwSingle !== undefined ? Number(rates.bwSingle) : 2);
    rawAmount = activePages * unitRate * copyCount;
  }

  const minOrder = rates.minOrder !== undefined ? Number(rates.minOrder) : 1;
  const totalAmount = Math.max(rawAmount, minOrder);

  return {
    unitPrice: unitRate,
    totalAmount,
    totalPages: activePages,
    totalSheets: totalSheets * copyCount,
    breakdown: `${activePages} pages (${isColor ? 'Color' : 'B&W'}, ${isDouble ? 'Both Sides' : 'Single Side'}) x ${copyCount} copies`
  };
}

module.exports = function (io, connectedAgents) {
  // 0. Get All Shops (for shop switcher & discovery)
  router.get('/shops', (req, res) => {
    const shops = db.getAllShops();
    res.json(shops);
  });

  // 1. Get Shop Details
  router.get('/shops/:shopId', (req, res) => {
    const shop = db.getShop(req.params.shopId);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    const isAgentConnected = !!connectedAgents[shop.id];
    res.json({
      ...shop,
      status: isAgentConnected ? 'online' : (shop.status || 'offline')
    });
  });

  // 1a. Verify Owner PIN for authenticated access
  router.post('/shops/:shopId/verify-pin', (req, res) => {
    const { pin } = req.body;
    const shop = db.getShop(req.params.shopId);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    const expectedPin = shop.pin || (shop.phone ? shop.phone.slice(-4) : '1234');
    if (String(pin).trim() === String(expectedPin).trim()) {
      return res.json({ success: true, shopName: shop.name });
    }
    return res.status(401).json({ error: 'Incorrect Owner PIN. Please try again.' });
  });

  // 1b. Download 1-Click Agent Launcher for this specific shop
  router.get('/shops/:shopId/download-launcher', (req, res) => {
    const shop = db.getShop(req.params.shopId);
    if (!shop) return res.status(404).send('Shop not found');

    const serverUrl = process.env.PUBLIC_SERVER_URL || 'https://printo-production-7fad6f69.up.railway.app';
    const batContent = `@echo off
title Printo Desktop Print Agent - ${shop.name}
echo ========================================================
echo   Printo Desktop Auto-Print Agent
echo   Shop: ${shop.name} (${shop.id})
echo ========================================================
echo.
set SHOP_ID=${shop.id}
set SERVER_URL=${serverUrl}
cd /d "%~dp0"
if exist "agent.js" (
  node agent.js
) else if exist "agent\\agent.js" (
  cd agent
  node agent.js
) else if exist "..\\agent\\agent.js" (
  cd ..\\agent
  node agent.js
) else if exist "D:\\printer\\agent\\agent.js" (
  cd /d "D:\\printer\\agent"
  node agent.js
) else (
  echo [ERROR] agent.js not found in this folder!
  echo Please make sure this .bat file is placed in your Printo folder or run D:\\printer\\start-printkwik.bat
)
pause
`;
    res.setHeader('Content-Type', 'application/x-bat');
    res.setHeader('Content-Disposition', `attachment; filename="start-${shop.id}-agent.bat"`);
    res.send(batContent);
  });

  // 2. Save / Update Shop
  router.post('/shops', (req, res) => {
    const { id, name, ownerName, phone, upiId, rates, pin } = req.body;
    if (!id || !name || !upiId) {
      return res.status(400).json({ error: 'Shop ID, Name, and UPI ID are required' });
    }
    const existing = db.getShop(id.toLowerCase().replace(/[^a-z0-9-_]/g, '-'));
    const updated = db.saveShop({
      id: id.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
      name,
      ownerName: ownerName || '',
      phone: phone || '',
      upiId: upiId.trim(),
      pin: pin ? String(pin).trim() : (existing?.pin || (phone ? phone.slice(-4) : '1234')),
      rates: rates || {
        bwSingle: 2,
        bwDouble: 3,
        colorSingle: 10,
        colorDouble: 16,
        idCard: 10,
        minOrder: 1
      }
    });
    res.json(updated);
  });

  // 3. Get Shop Orders
  router.get('/shops/:shopId/orders', (req, res) => {
    const orders = db.getShopOrders(req.params.shopId);
    res.json(orders);
  });

  // 4. Upload Standard Document (PDF or Image)
  router.post('/orders/upload-doc', upload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;
      const originalName = req.file.originalname;
      const tempId = 'doc_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      const targetPdfPath = path.join(UPLOADS_DIR, `${tempId}.pdf`);

      let pageCount = 1;

      if (mimeType === 'application/pdf') {
        fs.writeFileSync(targetPdfPath, fileBuffer);
        pageCount = await pdfService.countPdfPages(fileBuffer);
      } else if (mimeType.startsWith('image/')) {
        const pdfBytes = await pdfService.convertImageToPdf(fileBuffer, mimeType);
        fs.writeFileSync(targetPdfPath, pdfBytes);
        pageCount = 1;
      } else {
        // Fallback for docs: in production can convert with libreoffice, for now save directly
        fs.writeFileSync(targetPdfPath, fileBuffer);
        pageCount = 1;
      }

      res.json({
        tempFileId: tempId,
        fileName: originalName,
        pageCount,
        fileUrl: `/uploads/${tempId}.pdf`
      });
    } catch (err) {
      console.error('Upload document error:', err);
      res.status(500).json({ error: 'Failed to process document' });
    }
  });

  // 5. Upload Smart Aadhaar / ID Card (Front + Back)
  router.post('/orders/upload-id-card', upload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 }
  ]), async (req, res) => {
    try {
      if (!req.files || !req.files.front || !req.files.back) {
        return res.status(400).json({ error: 'Both Front and Back photos of ID card are required' });
      }

      const frontFile = req.files.front[0];
      const backFile = req.files.back[0];

      const mergedPdfBytes = await pdfService.createIdCardPdf(
        frontFile.buffer,
        frontFile.mimetype,
        backFile.buffer,
        backFile.mimetype
      );

      const tempId = 'idcard_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      const targetPdfPath = path.join(UPLOADS_DIR, `${tempId}.pdf`);
      fs.writeFileSync(targetPdfPath, mergedPdfBytes);

      res.json({
        tempFileId: tempId,
        fileName: 'Aadhaar_ID_Merged_A4.pdf',
        pageCount: 1,
        fileUrl: `/uploads/${tempId}.pdf`
      });
    } catch (err) {
      console.error('Upload ID card error:', err);
      res.status(500).json({ error: 'Failed to merge ID card photos' });
    }
  });

  // 6. Calculate Price Preview (instant live calculation as customer modifies options)
  router.post('/orders/calculate', (req, res) => {
    const { shopId, docType, colorMode, copies, sides, pageCount, selectedPagesCount } = req.body;
    const shop = db.getShop(shopId);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    const calculation = calculatePrice(shop, {
      docType,
      colorMode,
      copies,
      sides,
      pageCount,
      selectedPagesCount
    });
    res.json(calculation);
  });

  // 7. Create Order & Generate Payment Links / Dynamic UPI QR
  router.post('/orders/create', async (req, res) => {
    try {
      const {
        shopId,
        tempFileId,
        fileName,
        docType,
        colorMode,
        copies,
        sides,
        pageRange,
        pageCount,
        selectedPagesCount,
        customerPhone
      } = req.body;

      const shop = db.getShop(shopId);
      if (!shop) {
        return res.status(404).json({ error: 'Shop not found' });
      }

      const calculation = calculatePrice(shop, {
        docType,
        colorMode,
        copies,
        sides,
        pageCount,
        selectedPagesCount
      });

      const order = db.createOrder({
        shopId,
        tempFileId,
        fileName,
        fileUrl: `/uploads/${tempFileId}.pdf`,
        docType: docType || 'document',
        colorMode: colorMode || 'bw',
        copies: parseInt(copies) || 1,
        sides: sides || 'single',
        pageRange: pageRange || 'all',
        totalPages: calculation.totalPages,
        totalSheets: calculation.totalSheets,
        totalAmount: calculation.totalAmount,
        breakdown: calculation.breakdown,
        customerPhone: customerPhone || ''
      });

      // Construct UPI deep links
      const upiId = shop.upiId;
      const shopName = shop.name;
      const amountStr = calculation.totalAmount.toFixed(2);
      // Clean note without '#' or special characters that trigger bank parser errors
      const note = `Print Order ${order.orderCode}`;

      // Standard UPI URI
      const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${amountStr}&cu=INR&tn=${encodeURIComponent(note)}`;

      // App specific intents for Android / iOS mobile apps
      const intents = {
        generic: upiUrl,
        gpay: `gpay://upi/pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${amountStr}&cu=INR&tn=${encodeURIComponent(note)}`,
        phonepe: `phonepe://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${amountStr}&cu=INR&tn=${encodeURIComponent(note)}`,
        paytm: `paytmmp://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${amountStr}&cu=INR&tn=${encodeURIComponent(note)}`
      };

      // Generate dynamic QR code image (Base64 Data URL)
      const qrCodeDataUrl = await QRCode.toDataURL(upiUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });

      // Notify shopkeeper dashboard of new incoming order
      io.to(`shop_${shopId}`).emit('order_created', order);

      res.json({
        order,
        upiUrl,
        intents,
        qrCodeDataUrl
      });
    } catch (err) {
      console.error('Create order error:', err);
      res.status(500).json({ error: 'Failed to create order' });
    }
  });

  // 8. Verify Payment & Trigger Automatic Print Job
  router.post('/orders/:orderId/verify-payment', (req, res) => {
    const { orderId } = req.params;
    const { transactionId } = req.body;
    const order = db.getOrder(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.paymentStatus === 'paid') {
      return res.json({ success: true, order, alreadyPaid: true });
    }

    // Mark as PAID
    const updatedOrder = db.updateOrder(orderId, {
      paymentStatus: 'paid',
      printStatus: 'queued',
      paidAt: new Date().toISOString(),
      transactionId: transactionId || 'UPI_' + Date.now()
    });

    // Notify customer mobile screen that payment succeeded
    io.to(`order_${orderId}`).emit('order_status', updatedOrder);

    // Notify shopkeeper dashboard
    io.to(`shop_${order.shopId}`).emit('order_updated', updatedOrder);

    // Trigger Desktop Print Agent!
    const agentSocket = connectedAgents[order.shopId];
    if (agentSocket) {
      const fullPdfUrl = `${req.protocol}://${req.get('host')}${order.fileUrl}`;
      const printJob = {
        orderId: order.id,
        orderCode: order.orderCode,
        fileUrl: fullPdfUrl,
        fileName: order.fileName,
        options: {
          colorMode: order.colorMode,
          copies: order.copies,
          sides: order.sides,
          pageRange: order.pageRange
        }
      };

      console.log(`[PRINT DISPATCH] Dispatching job #${order.orderCode} to agent for shop ${order.shopId}`);
      agentSocket.emit('print_job', printJob);

      db.updateOrder(orderId, { printStatus: 'sent_to_printer' });
    } else {
      console.warn(`[PRINT AGENT OFFLINE] No connected agent found for shop: ${order.shopId}`);
    }

    res.json({ success: true, order: updatedOrder });
  });

  // 9. Reprint Order (Shopkeeper can reprint using the 4-digit code)
  router.post('/orders/:orderId/reprint', (req, res) => {
    const { orderId } = req.params;
    const { orderCode } = req.body;
    const order = db.getOrder(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (orderCode && order.orderCode !== orderCode.toString().trim()) {
      return res.status(403).json({ error: 'Incorrect 4-digit order code' });
    }

    const agentSocket = connectedAgents[order.shopId];
    if (!agentSocket) {
      return res.status(503).json({ error: 'Desktop Print Agent is offline on the shopkeeper PC' });
    }

    const fullPdfUrl = `${req.protocol}://${req.get('host')}${order.fileUrl}`;
    const printJob = {
      orderId: order.id,
      orderCode: order.orderCode,
      fileUrl: fullPdfUrl,
      fileName: order.fileName,
      options: {
        colorMode: order.colorMode,
        copies: order.copies,
        sides: order.sides,
        pageRange: order.pageRange
      },
      isReprint: true
    };

    agentSocket.emit('print_job', printJob);
    const updated = db.updateOrder(orderId, { printStatus: 'reprinting' });
    io.to(`shop_${order.shopId}`).emit('order_updated', updated);

    res.json({ success: true, message: `Reprint job #${order.orderCode} sent to printer` });
  });

  // 10. Check Order Status
  router.get('/orders/:orderId/status', (req, res) => {
    const order = db.getOrder(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  });

  // 11. Generate Standee QR code image
  router.get('/standee/:shopId/qr', async (req, res) => {
    try {
      const shop = db.getShop(req.params.shopId);
      if (!shop) return res.status(404).send('Shop not found');

      // The URL that customer mobile will open upon scanning
      let frontendOrigin = process.env.FRONTEND_URL;
      if (!frontendOrigin && req.query.origin) {
        frontendOrigin = req.query.origin;
      }
      if (!frontendOrigin && req.get('referer')) {
        try {
          frontendOrigin = new URL(req.get('referer')).origin;
        } catch (e) {}
      }
      if (!frontendOrigin) {
        const host = req.get('host');
        if (host && host.includes('railway.app')) {
          frontendOrigin = 'https://getprinto.in';
        } else {
          frontendOrigin = `${req.protocol}://${host}`;
        }
      }
      const targetUrl = `${frontendOrigin}/s/${shop.id}`;

      const qrBuffer = await QRCode.toBuffer(targetUrl, {
        width: 600,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });

      res.setHeader('Content-Type', 'image/png');
      res.send(qrBuffer);
    } catch (err) {
      console.error('QR code error:', err);
      res.status(500).send('Error generating QR');
    }
  });

  return router;
};

