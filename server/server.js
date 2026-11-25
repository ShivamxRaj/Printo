const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const { securityHeaders, sanitizeId, sanitizeText, getAgentAuthKey } = require('./security');

const app = express();
const server = http.createServer(app);

// Apply Security HTTP headers
app.use(securityHeaders);

// CORS configuration (allow trusted origins or standard web origins)
const allowedOrigins = [
  'https://getprinto.in',
  'https://www.getprinto.in',
  'http://localhost:5173',
  'http://localhost:5000',
  'http://localhost:4986',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, desktop agent) or matching origins/Vercel previews
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.railway.app') || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive for walk-in QR users across various local network gateways
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Request body size limits to prevent memory exhaustion DoS
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Secure temporary uploads folder: enforce nosniff, attachment/inline PDF headers, and prevent path traversal
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.get('/uploads/:filename', (req, res) => {
  const filename = sanitizeId(req.params.filename.replace(/\.pdf$/i, '')) + '.pdf';
  const filePath = path.join(UPLOADS_DIR, filename);

  // Path traversal check
  if (!filePath.startsWith(UPLOADS_DIR)) {
    return res.status(403).send('Forbidden');
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found or expired');
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.setHeader('Content-Disposition', 'inline; filename="printo-document.pdf"');
  res.sendFile(filePath);
});

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Map of shopId -> socket instance for connected Windows Desktop Print Agents
const connectedAgents = {};

// Register API routes
const apiRoutes = require('./routes/api')(io, connectedAgents);
app.use('/api', apiRoutes);

// Socket.IO event handlers with authentication & event origin verification
io.on('connection', (socket) => {
  // Customer joins specific order room to get real-time payment & printing updates
  socket.on('join_order', (orderId) => {
    const cleanOrderId = sanitizeId(orderId);
    if (cleanOrderId) {
      socket.join(`order_${cleanOrderId}`);
    }
  });

  // Shopkeeper dashboard joins shop room
  socket.on('join_shop', (shopId) => {
    const cleanShopId = sanitizeId(shopId);
    if (cleanShopId) {
      socket.join(`shop_${cleanShopId}`);
    }
  });

  // Windows Desktop Print Agent connects & authenticates
  socket.on('agent_register', ({ shopId, agentKey, pin, printers, activePrinter, machineName }) => {
    const cleanShopId = sanitizeId(shopId);
    const shop = db.getShop(cleanShopId, true);

    if (!shop) {
      socket.emit('agent_error', { message: 'Shop not found' });
      return;
    }

    const expectedPin = String(shop.pin || (shop.phone ? shop.phone.slice(-4) : '1234')).trim();
    const expectedKey = getAgentAuthKey(shop.id, expectedPin);

    // Verify Agent Key or PIN
    const isValidKey = agentKey && agentKey === expectedKey;
    const isValidPin = pin && String(pin).trim() === expectedPin;

    if (!isValidKey && !isValidPin) {
      console.warn(`[PRINT AGENT AUTH FAILED] Unauthorized agent attempt for shop: ${cleanShopId}`);
      socket.emit('agent_auth_failed', { message: 'Agent authentication key invalid.' });
      socket.disconnect(true);
      return;
    }

    console.log(`[PRINT AGENT ONLINE] Shop: ${cleanShopId} | Machine: ${machineName || 'Unknown'} | Active Printer: ${activePrinter}`);
    connectedAgents[cleanShopId] = socket;
    socket.shopId = cleanShopId;
    socket.isAgent = true;

    // Update shop status in DB
    db.updateShopStatus(cleanShopId, 'online', activePrinter);

    // Broadcast to shop dashboard that agent is live
    io.to(`shop_${cleanShopId}`).emit('agent_status', {
      status: 'online',
      activePrinter,
      printers: printers || [],
      machineName: sanitizeText(machineName, 50)
    });
  });

  // Print Agent sends update on job progress (only authenticated agent can update)
  socket.on('job_status_update', ({ orderId, status, error }) => {
    if (!socket.isAgent || !socket.shopId) {
      return; // Ignore unauthorized emitters
    }

    const cleanOrderId = sanitizeId(orderId);
    const order = db.getOrder(cleanOrderId);
    if (!order || order.shopId !== socket.shopId) {
      return; // Prevent cross-shop tampering
    }

    const updated = db.updateOrder(cleanOrderId, {
      printStatus: status,
      printError: error ? sanitizeText(error, 200) : null,
      completedAt: status === 'completed' ? new Date().toISOString() : null
    });

    if (updated) {
      // Notify customer mobile screen
      io.to(`order_${cleanOrderId}`).emit('order_status', updated);
      // Notify shopkeeper dashboard
      io.to(`shop_${updated.shopId}`).emit('order_updated', updated);

      // If completed, trigger auto-purge after 30 seconds
      if (status === 'completed' && updated.tempFileId) {
        setTimeout(() => {
          const filePath = path.join(UPLOADS_DIR, `${updated.tempFileId}.pdf`);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              console.log(`[AUTO-PURGE] Purged printed file for order #${updated.orderCode}: ${filePath}`);
            } catch (e) {
              console.error('Failed to purge file:', e.message);
            }
          }
        }, 30000); // 30 seconds
      }
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    if (socket.shopId && connectedAgents[socket.shopId] === socket) {
      console.log(`[PRINT AGENT OFFLINE] Shop: ${socket.shopId} disconnected`);
      delete connectedAgents[socket.shopId];
      db.updateShopStatus(socket.shopId, 'offline');
      io.to(`shop_${socket.shopId}`).emit('agent_status', { status: 'offline' });
    }
  });
});

// Fallback redirects to production frontend when client/dist is not bundled (e.g. on Railway)
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'https://getprinto.in';

app.get('/s/:shopId', (req, res) => {
  res.redirect(`${FRONTEND_ORIGIN}/s/${req.params.shopId}`);
});

app.get('/standee/:shopId', (req, res) => {
  res.redirect(`${FRONTEND_ORIGIN}/standee/${req.params.shopId}`);
});

app.get('/dashboard', (req, res) => {
  res.redirect(`${FRONTEND_ORIGIN}/dashboard`);
});

// Serve frontend static build and SEO root files (when client/dist exists)
const CLIENT_DIST = path.join(__dirname, '../client/dist');
if (fs.existsSync(CLIENT_DIST)) {
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain').sendFile(path.join(CLIENT_DIST, 'robots.txt'));
  });
  app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml').sendFile(path.join(CLIENT_DIST, 'sitemap.xml'));
  });
  app.get('/llms.txt', (req, res) => {
    res.type('text/plain').sendFile(path.join(CLIENT_DIST, 'llms.txt'));
  });

  app.use(express.static(CLIENT_DIST));
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    } else {
      next();
    }
  });
}

// Background auto-purge worker for orphaned files older than 15 minutes
setInterval(() => {
  fs.readdir(UPLOADS_DIR, (err, files) => {
    if (err) return;
    const now = Date.now();
    files.forEach(file => {
      const filePath = path.join(UPLOADS_DIR, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > 15 * 60 * 1000) { // 15 minutes
          fs.unlinkSync(filePath);
          console.log(`[AUTO-PURGE] Cleaned up expired file: ${file}`);
        }
      } catch (e) {}
    });
  });
}, 5 * 60 * 1000); // Check every 5 minutes

// Safe global error handler to prevent stack trace leaks (Security Misconfiguration #30)
app.use((err, req, res, next) => {
  console.error('[UNHANDLED SERVER ERROR]:', err.message);
  res.status(500).json({ error: 'An unexpected internal error occurred. Please try again later.' });
});

const PORT = process.env.PORT || 4986;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 Printo SaaS Gateway running securely on port ${PORT}`);
  console.log(`📱 Customer Portal: http://localhost:${PORT}/s/shivam`);
  console.log(`🖥️  Shopkeeper Admin: http://localhost:${PORT}/dashboard`);
  console.log(`🖨️  Print Standee Poster: http://localhost:${PORT}/standee/shivam`);
  console.log(`====================================================`);
});

// Also bind port 5000 for local dev if PORT is not 5000
if (String(PORT) !== '5000') {
  try {
    const localDevServer = http.createServer(app);
    io.attach(localDevServer);
    localDevServer.listen(5000, '0.0.0.0', () => {
      console.log(`🔌 Dual listener active on port 5000`);
    }).on('error', () => {});
  } catch (e) {}
}
