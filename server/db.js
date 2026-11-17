const fs = require('fs');
const path = require('path');

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
      rates: {
        bwSingle: 2.0,       // ₹2 / page B&W single side
        bwDouble: 3.0,       // ₹3 / sheet B&W both sides
        colorSingle: 10.0,   // ₹10 / page Color single side
        colorDouble: 16.0,   // ₹16 / sheet Color both sides
        idCard: 10.0,        // ₹10 per smart ID/Aadhaar card
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
      rates: {
        bwSingle: 2.0,       // ₹2 / page B&W single side
        bwDouble: 3.0,       // ₹3 / sheet B&W both sides
        colorSingle: 10.0,   // ₹10 / page Color single side
        colorDouble: 16.0,   // ₹16 / sheet Color both sides
        idCard: 10.0,        // ₹10 per smart ID/Aadhaar card
        minOrder: 1.0        // Minimum order ₹1
      },
      status: 'online',
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
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

const db = {
  getShop(id) {
    const data = readDb();
    return data.shops.find(s => s.id === id) || null;
  },

  getAllShops() {
    const data = readDb();
    return data.shops;
  },

  saveShop(shopData) {
    const data = readDb();
    const index = data.shops.findIndex(s => s.id === shopData.id);
    if (index >= 0) {
      data.shops[index] = { ...data.shops[index], ...shopData, updatedAt: new Date().toISOString() };
    } else {
      data.shops.push({
        ...shopData,
        createdAt: new Date().toISOString()
      });
    }
    writeDb(data);
    return shopData;
  },

  updateShopStatus(id, status, activePrinter = null) {
    const data = readDb();
    const shop = data.shops.find(s => s.id === id);
    if (shop) {
      shop.status = status;
      if (activePrinter) shop.activePrinter = activePrinter;
      shop.lastSeen = new Date().toISOString();
      writeDb(data);
      return shop;
    }
    return null;
  },

  createOrder(orderData) {
    const data = readDb();
    // Generate a 4-digit numeric code for customer verification & reprint
    const orderCode = Math.floor(1000 + Math.random() * 9000).toString();
    const order = {
      id: 'ord_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      orderCode,
      createdAt: new Date().toISOString(),
      paymentStatus: 'pending', // pending, paid, failed
      printStatus: 'queued',    // queued, printing, completed, failed
      ...orderData
    };
    data.orders.unshift(order); // Newest first
    writeDb(data);
    return order;
  },

  getOrder(id) {
    const data = readDb();
    return data.orders.find(o => o.id === id) || null;
  },

  getOrderByCode(shopId, orderCode) {
    const data = readDb();
    return data.orders.find(o => o.shopId === shopId && o.orderCode === orderCode) || null;
  },

  getShopOrders(shopId, limit = 50) {
    const data = readDb();
    return data.orders
      .filter(o => o.shopId === shopId)
      .slice(0, limit);
  },

  updateOrder(id, updates) {
    const data = readDb();
    const index = data.orders.findIndex(o => o.id === id);
    if (index >= 0) {
      data.orders[index] = { ...data.orders[index], ...updates, updatedAt: new Date().toISOString() };
      writeDb(data);
      return data.orders[index];
    }
    return null;
  }
};

module.exports = db;

