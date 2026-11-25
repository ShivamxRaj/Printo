const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { cleanObject, sanitizeText, sanitizePositiveInt } = require('./security');

const DB_FILE = path.join(__dirname, 'data.json');

// Default initial state
const defaultData = {
  shops: [
    {
      id: 'shivam',
      name: 'Shivam',
      ownerName: 'Shivam Raj',
      phone: '6299446452',
      upiId: '6299446452-2@yb1',
      pin: '4652',
      rates: {
        bwSingle: 2.0,       // ₹2 / page B&W single side
        bwDouble: 3.0,       // ₹3 / sheet B&W both sides
        colorSingle: 10.0,   // ₹10 / page Color single side
        colorDouble: 16.0,   // ₹16 / sheet Color both sides
        idCardBw: 5.0,       // ₹5 per B&W ID/Aadhaar card
        idCard: 10.0,        // ₹10 per Color ID/Aadhaar card
        minOrder: 1.0        // Minimum order ₹1
      },
      status: 'online',
      activePrinter: 'Default Windows Printer',
      createdAt: new Date().toISOString()
    },
    {
      id: 'demo-shop',
      name: 'Shivam',
      ownerName: 'Shivam Raj',
      phone: '6299446452',
      upiId: '6299446452-2@yb1',
      pin: '1234',
      rates: {
        bwSingle: 2.0,
        bwDouble: 3.0,
        colorSingle: 10.0,
        colorDouble: 16.0,
        idCard: 10.0,
        minOrder: 1.0
      },
      status: 'offline',
      activePrinter: 'Default Windows Printer',
      createdAt: new Date().toISOString()
    }
  ],
  orders: []
};

// Initialize DB file if not exists
function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
  }
}

function readDb() {
  initDb();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB, restoring default:', err);
    return defaultData;
  }
}

function writeDb(data) {
  // Atomic write via temp file to avoid corruption
  const tempFile = `${DB_FILE}.${Date.now()}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
  fs.renameSync(tempFile, DB_FILE);
}

// Strip sensitive confidential fields like PIN before returning to public
function sanitizePublicShop(shop) {
  if (!shop) return null;
  const { pin, ...publicData } = shop;
  return publicData;
}

const db = {
  getShop(id, includeSecrets = false) {
    if (!id || typeof id !== 'string') return null;
    const cleanId = id.trim().toLowerCase();
    const data = readDb();
    const shop = data.shops.find(s => s.id === cleanId) || null;
    if (!shop) return null;
    return includeSecrets ? { ...shop } : sanitizePublicShop(shop);
  },

  getAllShops(includeSecrets = false) {
    const data = readDb();
    if (includeSecrets) return data.shops;
    return data.shops.map(sanitizePublicShop);
  },

  saveShop(shopInput) {
    const data = readDb();
    const cleanInput = cleanObject(shopInput);
    const id = cleanInput.id;
    if (!id) throw new Error('Shop ID required');

    const index = data.shops.findIndex(s => s.id === id);
    const existing = index >= 0 ? data.shops[index] : null;

    // Strict field whitelist to prevent mass assignment
    const sanitizedShop = {
      id,
      name: sanitizeText(cleanInput.name, 80),
      ownerName: sanitizeText(cleanInput.ownerName, 80),
      phone: sanitizeText(cleanInput.phone, 20),
      upiId: sanitizeText(cleanInput.upiId, 60),
      pin: cleanInput.pin ? String(cleanInput.pin).trim().slice(0, 10) : (existing?.pin || '1234'),
      rates: {
        bwSingle: Number(cleanInput.rates?.bwSingle) || 2,
        bwDouble: Number(cleanInput.rates?.bwDouble) || 3,
        colorSingle: Number(cleanInput.rates?.colorSingle) || 10,
        colorDouble: Number(cleanInput.rates?.colorDouble) || 16,
        idCardBw: Number(cleanInput.rates?.idCardBw) || 5,
        idCard: Number(cleanInput.rates?.idCard) || 10,
        minOrder: Number(cleanInput.rates?.minOrder) || 1
      },
      status: existing?.status || 'offline',
      activePrinter: existing?.activePrinter || 'Default Windows Printer',
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
      data.shops[index] = sanitizedShop;
    } else {
      data.shops.push(sanitizedShop);
    }

    writeDb(data);
    return sanitizePublicShop(sanitizedShop);
  },

  updateShopStatus(id, status, activePrinter = null) {
    const data = readDb();
    const shop = data.shops.find(s => s.id === id);
    if (shop) {
      shop.status = status === 'online' ? 'online' : 'offline';
      if (activePrinter) shop.activePrinter = sanitizeText(activePrinter, 100);
      shop.lastSeen = new Date().toISOString();
      writeDb(data);
      return sanitizePublicShop(shop);
    }
    return null;
  },

  createOrder(orderData) {
    const data = readDb();
    const cleanInput = cleanObject(orderData);

    // Cryptographically secure 4-digit numeric code for customer verification & reprint
    const orderCode = crypto.randomInt(1000, 10000).toString();
    const orderId = 'ord_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');

    const order = {
      id: orderId,
      orderCode,
      shopId: cleanInput.shopId,
      tempFileId: cleanInput.tempFileId,
      fileName: sanitizeText(cleanInput.fileName, 120),
      fileUrl: cleanInput.fileUrl,
      docType: cleanInput.docType === 'id_card' ? 'id_card' : 'document',
      colorMode: cleanInput.colorMode === 'color' ? 'color' : 'bw',
      copies: sanitizePositiveInt(cleanInput.copies, 1, 500, 1),
      sides: cleanInput.sides === 'double' ? 'double' : 'single',
      pageRange: sanitizeText(cleanInput.pageRange, 50) || 'all',
      totalPages: sanitizePositiveInt(cleanInput.totalPages, 1, 2000, 1),
      totalSheets: sanitizePositiveInt(cleanInput.totalSheets, 1, 2000, 1),
      totalAmount: Math.max(0, Number(cleanInput.totalAmount) || 0),
      breakdown: sanitizeText(cleanInput.breakdown, 200),
      customerPhone: sanitizeText(cleanInput.customerPhone, 20),
      createdAt: new Date().toISOString(),
      paymentStatus: 'pending', // pending, paid, failed
      printStatus: 'queued'     // queued, sent_to_printer, printing, completed, failed
    };

    data.orders.unshift(order); // Newest first
    if (data.orders.length > 500) {
      data.orders = data.orders.slice(0, 500); // Bounded history
    }

    writeDb(data);
    return order;
  },

  getOrder(id) {
    if (!id || typeof id !== 'string') return null;
    const data = readDb();
    return data.orders.find(o => o.id === id) || null;
  },

  getOrderByCode(shopId, orderCode) {
    if (!shopId || !orderCode) return null;
    const data = readDb();
    return data.orders.find(o => o.shopId === shopId && o.orderCode === String(orderCode).trim()) || null;
  },

  getShopOrders(shopId, limit = 50) {
    if (!shopId || typeof shopId !== 'string') return [];
    const data = readDb();
    return data.orders
      .filter(o => o.shopId === shopId)
      .slice(0, Math.min(limit, 100));
  },

  updateOrder(id, updates) {
    if (!id || typeof id !== 'string') return null;
    const data = readDb();
    const index = data.orders.findIndex(o => o.id === id);
    if (index >= 0) {
      const cleanUpdates = cleanObject(updates);
      // Whitelist update fields
      const allowed = ['paymentStatus', 'printStatus', 'printError', 'completedAt', 'paidAt', 'transactionId', 'paymentClaimed', 'claimedAt'];
      const sanitizedUpdates = {};
      for (const key of allowed) {
        if (cleanUpdates[key] !== undefined) {
          sanitizedUpdates[key] = cleanUpdates[key];
        }
      }
      data.orders[index] = { ...data.orders[index], ...sanitizedUpdates, updatedAt: new Date().toISOString() };
      writeDb(data);
      return data.orders[index];
    }
    return null;
  }
};

module.exports = db;
