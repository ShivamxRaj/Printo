const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve temporary uploads folder (with auto-purge)
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

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

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log(`[SOCKET CONNECTED] Socket ID: ${socket.id}`);

  // Customer joins specific order room to get real-time payment & printing updates
  socket.on('join_order', (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`[ORDER ROOM] Socket ${socket.id} joined order_${orderId}`);
  });

  // Shopkeeper dashboard joins shop room
  socket.on('join_shop', (shopId) => {
    socket.join(`shop_${shopId}`);
    console.log(`[DASHBOARD ROOM] Socket ${socket.id} joined shop_${shopId}`);
  });

  // Windows Desktop Print Agent connects & authenticates
  socket.on('agent_register', ({ shopId, printers, activePrinter, machineName }) => {
    console.log(`[PRINT AGENT ONLINE] Shop: ${shopId} | Machine: ${machineName || 'Unknown'} | Active Printer: ${activePrinter}`);
    connectedAgents[shopId] = socket;
    socket.shopId = shopId;

    // Update shop status in DB
    db.updateShopStatus(shopId, 'online', activePrinter);

    // Broadcast to shop dashboard that agent is live
    io.to(`shop_${shopId}`).emit('agent_status', {
      status: 'online',
      activePrinter,
      printers: printers || [],
      machineName
    });
  });

  // Print Agent sends update on job progress (e.g. printing, completed, failed)
  socket.on('job_status_update', ({ orderId, status, error }) => {
    console.log(`[JOB STATUS] Order ${orderId} -> ${status}${error ? ' Error: ' + error : ''}`);
    const updated = db.updateOrder(orderId, {
      printStatus: status,
      printError: error || null,
      completedAt: status === 'completed' ? new Date().toISOString() : null
    });

    if (updated) {
      // Notify customer mobile screen
      io.to(`order_${orderId}`).emit('order_status', updated);
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
              console.error('Failed to purge file:', e);
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
  // Explicit SEO routes with exact Content-Type headers
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

const PORT = process.env.PORT || 4986;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 PrintKwik SaaS Gateway running on port ${PORT}`);
  console.log(`📱 Customer Portal: http://localhost:${PORT}/s/demo-shop`);
  console.log(`🖥️  Shopkeeper Admin: http://localhost:${PORT}/dashboard`);
  console.log(`🖨️  Print Standee Poster: http://localhost:${PORT}/standee/demo-shop`);
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
