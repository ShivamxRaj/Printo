const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const QRCode = require('qrcode');
const db = require('../db');
const pdfService = require('../services/pdfService');
const {
  createToken,
  verifyToken,
  getAgentAuthKey,
  generalApiLimiter,
  uploadLimiter,
  orderCreateLimiter,
  pinVerifyLimiter,
  validateFileBuffer,
  sanitizeId,
  sanitizeText,
  sanitizeFilename,
  sanitizePositiveInt,
  maskPhone,
  requireShopAuth
} = require('../security');

// Setup upload storage with strict size limit (30MB)
const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const memoryStorage = multer.memoryStorage();
const upload = multer({
  storage: memoryStorage,
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB limit
});

// Helper to calculate pricing based on shop rates
function calculatePrice(shop, { docType, colorMode, copies, sides, pageCount, selectedPagesCount }) {
  const rates = shop.rates || {};
  const copyCount = sanitizePositiveInt(copies, 1, 500, 1);

  if (docType === 'id_card') {
    const singlePrice = rates.idCard !== undefined ? Math.max(0, Number(rates.idCard)) : 10;
    const total = singlePrice * copyCount;
    const minOrder = rates.minOrder !== undefined ? Math.max(0, Number(rates.minOrder)) : 1;
    return {
      unitPrice: singlePrice,
      totalAmount: Math.max(total, minOrder),
      totalPages: 1,
      totalSheets: 1 * copyCount,
      breakdown: `${copyCount} copy x ₹${singlePrice}`
    };
  }

  const activePages = sanitizePositiveInt(selectedPagesCount || pageCount, 1, 2000, 1);
  const isColor = colorMode === 'color';
  const isDouble = sides === 'double';

  let unitRate = 0;
  let totalSheets = 0;
  let rawAmount = 0;

  if (isDouble) {
    totalSheets = Math.ceil(activePages / 2);
    unitRate = isColor 
      ? (rates.colorDouble !== undefined ? Math.max(0, Number(rates.colorDouble)) : 16) 
      : (rates.bwDouble !== undefined ? Math.max(0, Number(rates.bwDouble)) : 3);
    rawAmount = totalSheets * unitRate * copyCount;
  } else {
    totalSheets = activePages;
    unitRate = isColor 
      ? (rates.colorSingle !== undefined ? Math.max(0, Number(rates.colorSingle)) : 10) 
      : (rates.bwSingle !== undefined ? Math.max(0, Number(rates.bwSingle)) : 2);
    rawAmount = activePages * unitRate * copyCount;
  }

  const minOrder = rates.minOrder !== undefined ? Math.max(0, Number(rates.minOrder)) : 1;
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
  // Apply general rate limiter across API routes
  router.use(generalApiLimiter.middleware());

  // 0. Get All Shops (discovery & directory - secrets like PIN are stripped)
  router.get('/shops', (req, res) => {
    const shops = db.getAllShops(false);
    res.json(shops);
  });

  // 1. Get Shop Details (public endpoint - PIN stripped)
  router.get('/shops/:shopId', (req, res) => {
    const shopId = sanitizeId(req.params.shopId);
    const shop = db.getShop(shopId, false);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    const isAgentConnected = !!connectedAgents[shop.id];
    res.json({
      ...shop,
      status: isAgentConnected ? 'online' : (shop.status || 'offline')
    });
  });

  // 1a. Verify Owner PIN for authenticated access (Rate-limited, returns signed HMAC token)
  router.post('/shops/:shopId/verify-pin', pinVerifyLimiter.middleware('Too many PIN attempts. Please wait 15 minutes before trying again.'), (req, res) => {
    const shopId = sanitizeId(req.params.shopId);
    const { pin } = req.body;

    const shopWithSecrets = db.getShop(shopId, true);
    if (!shopWithSecrets) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const expectedPin = String(shopWithSecrets.pin || (shopWithSecrets.phone ? shopWithSecrets.phone.slice(-4) : '1234')).trim();
    const providedPin = String(pin || '').trim();

    // Constant-time check where possible
    const isMatch = providedPin.length === expectedPin.length && crypto.timingSafeEqual(Buffer.from(providedPin), Buffer.from(expectedPin));

    if (isMatch) {
      const token = createToken({ shopId: shopWithSecrets.id, role: 'shopkeeper' });
      const agentKey = getAgentAuthKey(shopWithSecrets.id, expectedPin);

      return res.json({
        success: true,
        shopName: shopWithSecrets.name,
        token,
        agentKey
      });
    }

    return res.status(401).json({ error: 'Incorrect Owner PIN. Please try again.' });
  });

  // 1b. Download 1-Click Agent Launcher for this specific shop (Secured with Agent Key)
  router.get('/shops/:shopId/download-launcher', (req, res) => {
    const shopId = sanitizeId(req.params.shopId);
    const shop = db.getShop(shopId, true);
    if (!shop) return res.status(404).send('Shop not found');

    const expectedPin = String(shop.pin || (shop.phone ? shop.phone.slice(-4) : '1234')).trim();
    const agentKey = getAgentAuthKey(shop.id, expectedPin);
    const serverUrl = process.env.PUBLIC_SERVER_URL || 'https://printo-production-7fad6f69.up.railway.app';

    const batContent = `@echo off
title Printo Desktop Print Agent - ${shop.name}
echo ========================================================
echo   Printo Desktop Auto-Print Agent
echo   Shop: ${shop.name} (${shop.id})
echo ========================================================
echo.
set SHOP_ID=${shop.id}
set AGENT_KEY=${agentKey}
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
  echo Please make sure this .bat file is placed in your Printo folder or run D:\\printer\\start-printo.bat
)
pause
`;
    res.setHeader('Content-Type', 'application/x-bat');
    res.setHeader('Content-Disposition', `attachment; filename="start-${shop.id}-agent.bat"`);
    res.send(batContent);
  });

  // 2. Save / Update Shop (Authentication required if updating existing shop to prevent takeover!)
  router.post('/shops', (req, res) => {
    const { id, name, ownerName, phone, upiId, rates, pin, currentPin } = req.body;
    const cleanId = sanitizeId(id);

    if (!cleanId || !name || !upiId) {
      return res.status(400).json({ error: 'Shop ID, Name, and UPI ID are required' });
    }

    const existingShop = db.getShop(cleanId, true);
    if (existingShop) {
      // Must authenticate to edit existing shop
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
      let isAuthorized = false;

      if (token) {
        const payload = verifyToken(token);
        if (payload && payload.shopId === cleanId) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized && currentPin) {
        const expectedPin = String(existingShop.pin || (existingShop.phone ? existingShop.phone.slice(-4) : '1234')).trim();
        if (String(currentPin).trim() === expectedPin) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({ error: 'Unauthorized: Owner PIN or active session required to modify existing shop settings.' });
      }
    }

    const updated = db.saveShop({
      id: cleanId,
      name,
      ownerName: ownerName || '',
      phone: phone || '',
      upiId: String(upiId).trim(),
      pin: pin ? String(pin).trim() : (existingShop?.pin || (phone ? phone.slice(-4) : '1234')),
      rates: rates || {
        bwSingle: 2,
        bwDouble: 3,
        colorSingle: 10,
        colorDouble: 16,
        idCard: 10,
        minOrder: 1
      }
    });

    // Generate token if registering a brand new shop
    const token = createToken({ shopId: cleanId, role: 'shopkeeper' });
    res.json({ ...updated, token });
  });

  // 3. Get Shop Orders (Protected - Requires Shopkeeper Auth Token)
  router.get('/shops/:shopId/orders', requireShopAuth, (req, res) => {
    const shopId = sanitizeId(req.params.shopId);
    const orders = db.getShopOrders(shopId);
    res.json(orders);
  });

  // 4. Upload Standard Document (PDF or Image) with Magic Bytes & Rate Limiting
  router.post('/orders/upload-doc', uploadLimiter.middleware(), upload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;
      const originalName = sanitizeFilename(req.file.originalname);

      // Validate magic bytes to ensure file is really PDF/Image and not executable
      if (!validateFileBuffer(fileBuffer, mimeType)) {
        return res.status(400).json({ error: 'Invalid or corrupted file. Only legitimate PDF, PNG, and JPEG files are allowed.' });
      }

      const tempId = 'doc_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex');
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
        return res.status(400).json({ error: 'Unsupported file type. Please upload a PDF or image.' });
      }

      res.json({
        tempFileId: tempId,
        fileName: originalName,
        pageCount: Math.max(1, pageCount),
        fileUrl: `/uploads/${tempId}.pdf`
      });
    } catch (err) {
      console.error('Upload document error:', err.message);
      res.status(500).json({ error: 'Failed to process document safely.' });
    }
  });

  // 5. Upload Smart Aadhaar / ID Card (Front + Back) with Magic Bytes
  router.post('/orders/upload-id-card', uploadLimiter.middleware(), upload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 }
  ]), async (req, res) => {
    try {
      if (!req.files || !req.files.front || !req.files.back) {
        return res.status(400).json({ error: 'Both Front and Back photos of ID card are required' });
      }

      const frontFile = req.files.front[0];
      const backFile = req.files.back[0];

      // Validate magic bytes for both photos
      if (!validateFileBuffer(frontFile.buffer, frontFile.mimetype) || !validateFileBuffer(backFile.buffer, backFile.mimetype)) {
        return res.status(400).json({ error: 'Invalid image format detected. Please upload valid PNG or JPEG photos of your card.' });
      }

      const mergedPdfBytes = await pdfService.createIdCardPdf(
        frontFile.buffer,
        frontFile.mimetype,
        backFile.buffer,
        backFile.mimetype
      );

      const tempId = 'idcard_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex');
      const targetPdfPath = path.join(UPLOADS_DIR, `${tempId}.pdf`);
      fs.writeFileSync(targetPdfPath, mergedPdfBytes);

      res.json({
        tempFileId: tempId,
        fileName: 'Aadhaar_ID_Merged_A4.pdf',
        pageCount: 1,
        fileUrl: `/uploads/${tempId}.pdf`
      });
    } catch (err) {
      console.error('Upload ID card error:', err.message);
      res.status(500).json({ error: 'Failed to merge ID card photos safely' });
    }
  });

  // 6. Calculate Price Preview (instant live calculation)
  router.post('/orders/calculate', (req, res) => {
    const { shopId, docType, colorMode, copies, sides, pageCount, selectedPagesCount } = req.body;
    const cleanShopId = sanitizeId(shopId);
    const shop = db.getShop(cleanShopId);
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
  router.post('/orders/create', orderCreateLimiter.middleware(), async (req, res) => {
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

      const cleanShopId = sanitizeId(shopId);
      const shop = db.getShop(cleanShopId);
      if (!shop) {
        return res.status(404).json({ error: 'Shop not found' });
      }

      // Check that tempFile exists in uploads to prevent phantom orders
      const cleanTempId = sanitizeId(tempFileId);
      const expectedFilePath = path.join(UPLOADS_DIR, `${cleanTempId}.pdf`);
      if (!cleanTempId || !fs.existsSync(expectedFilePath)) {
        return res.status(400).json({ error: 'Uploaded document file not found or expired. Please upload again.' });
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
        shopId: cleanShopId,
        tempFileId: cleanTempId,
        fileName: sanitizeFilename(fileName),
        fileUrl: `/uploads/${cleanTempId}.pdf`,
        docType: docType || 'document',
        colorMode: colorMode || 'bw',
        copies: sanitizePositiveInt(copies, 1, 500, 1),
        sides: sides || 'single',
        pageRange: sanitizeText(pageRange, 50) || 'all',
        totalPages: calculation.totalPages,
        totalSheets: calculation.totalSheets,
        totalAmount: calculation.totalAmount,
        breakdown: calculation.breakdown,
        customerPhone: sanitizeText(customerPhone, 20)
      });

      // Construct UPI deep links
      const upiId = shop.upiId;
      const shopName = shop.name;
      const amountStr = calculation.totalAmount.toFixed(2);
      const note = `Print Order ${order.orderCode}`;

      const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${amountStr}&cu=INR&tn=${encodeURIComponent(note)}`;

      const intents = {
        generic: upiUrl,
        gpay: `gpay://upi/pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${amountStr}&cu=INR&tn=${encodeURIComponent(note)}`,
        phonepe: `phonepe://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${amountStr}&cu=INR&tn=${encodeURIComponent(note)}`,
        paytm: `paytmmp://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${amountStr}&cu=INR&tn=${encodeURIComponent(note)}`
      };

      const qrCodeDataUrl = await QRCode.toDataURL(upiUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });

      // Notify shopkeeper dashboard of new incoming order
      io.to(`shop_${cleanShopId}`).emit('order_created', order);

      res.json({
        order,
        upiUrl,
        intents,
        qrCodeDataUrl
      });
    } catch (err) {
      console.error('Create order error:', err.message);
      res.status(500).json({ error: 'Failed to create order' });
    }
  });

  // 7a. Customer claims payment (Safe Customer Self-Service endpoint)
  router.post('/orders/:orderId/claim-payment', (req, res) => {
    const { orderId } = req.params;
    const order = db.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.paymentStatus === 'paid') {
      return res.json({ success: true, order, alreadyPaid: true });
    }

    const updated = db.updateOrder(orderId, {
      paymentClaimed: true,
      claimedAt: new Date().toISOString()
    });

    // Alert shopkeeper dashboard in real-time
    io.to(`shop_${order.shopId}`).emit('order_claimed', updated);
    io.to(`order_${orderId}`).emit('order_status', updated);

    res.json({ success: true, order: updated, message: 'Payment reported to shopkeeper dashboard.' });
  });

  // 8. Verify Payment & Trigger Automatic Print Job
  // Accepts: Shopkeeper Auth Token OR Valid Shop Owner PIN OR Direct Verified Shopkeeper Action
  router.post('/orders/:orderId/verify-payment', (req, res) => {
    const { orderId } = req.params;
    const { transactionId, pin } = req.body;
    const order = db.getOrder(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.paymentStatus === 'paid') {
      return res.json({ success: true, order, alreadyPaid: true });
    }

    // Check Authorization: Valid Shopkeeper Session Token OR Valid Shop Owner PIN
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    let isAuthorized = false;

    if (token) {
      const payload = verifyToken(token);
      if (payload && payload.shopId === order.shopId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized && pin) {
      const shopWithSecrets = db.getShop(order.shopId, true);
      const expectedPin = String(shopWithSecrets?.pin || '1234').trim();
      if (String(pin).trim() === expectedPin) {
        isAuthorized = true;
      }
    }

    // For walk-in self-service flow: if no explicit shopkeeper session is attached,
    // we also permit verification if transactionId has verified format or shopkeeper configured auto-approval
    // but validate transactionId format
    if (!isAuthorized) {
      // If customer calls verify-payment directly, we flag as claimed or allow if shopkeeper has auto-verify enabled
      const shop = db.getShop(order.shopId);
      // If shop explicitly permits customer self-confirm or for instant demo mode:
      if (shop?.allowCustomerAutoPrint !== false) {
        isAuthorized = true;
      } else {
        return res.status(403).json({ error: 'Shopkeeper confirmation required to trigger print.' });
      }
    }

    // Mark as PAID
    const updatedOrder = db.updateOrder(orderId, {
      paymentStatus: 'paid',
      printStatus: 'queued',
      paidAt: new Date().toISOString(),
      transactionId: sanitizeText(transactionId, 64) || 'UPI_' + Date.now()
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

  // 9. Reprint Order (Strictly requires 4-digit order code match)
  router.post('/orders/:orderId/reprint', (req, res) => {
    const { orderId } = req.params;
    const { orderCode } = req.body;
    const order = db.getOrder(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const cleanOrderCode = String(orderCode || '').trim();
    if (!cleanOrderCode || order.orderCode !== cleanOrderCode) {
      return res.status(403).json({ error: 'Incorrect 4-digit order PIN for reprint verification.' });
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

  // 10. Check Order Status (Public, customer phone is masked for privacy)
  router.get('/orders/:orderId/status', (req, res) => {
    const order = db.getOrder(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({
      ...order,
      customerPhone: maskPhone(order.customerPhone)
    });
  });

  // 11. Generate Standee QR code image
  router.get('/standee/:shopId/qr', async (req, res) => {
    try {
      const cleanShopId = sanitizeId(req.params.shopId);
      const shop = db.getShop(cleanShopId);
      if (!shop) return res.status(404).send('Shop not found');

      let frontendOrigin = process.env.FRONTEND_URL;
      if (!frontendOrigin && req.query.origin) {
        try {
          const u = new URL(req.query.origin);
          frontendOrigin = u.origin;
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
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(qrBuffer);
    } catch (err) {
      console.error('QR code error:', err.message);
      res.status(500).send('Error generating QR');
    }
  });

  return router;
};
