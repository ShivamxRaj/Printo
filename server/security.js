const crypto = require('crypto');

// Secret for HMAC signing (fallback to stable local key if not in env)
const AUTH_SECRET = process.env.AUTH_SECRET || crypto.createHash('sha256').update(process.env.JWT_SECRET || 'printo-secure-secret-v1-key-salt').digest('hex');

/**
 * 1. Cryptographically Secure Token Generation & Verification
 */
function createToken(payload, expiresInMs = 24 * 60 * 60 * 1000) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Date.now() + expiresInMs;
  const data = { ...payload, exp, iat: Date.now() };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  // Constant-time comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch (e) {
    return null;
  }
}

/**
 * 2. Generate Deterministic Agent Key for Shop
 */
function getAgentAuthKey(shopId, pin) {
  return crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`agent:${shopId}:${pin || '1234'}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * 3. In-Memory Rate Limiting
 */
class RateLimiter {
  constructor(windowMs, maxHits) {
    this.windowMs = windowMs;
    this.maxHits = maxHits;
    this.hits = new Map();

    // Auto cleanup old entries (unref so tests or shutdown don't hang)
    const cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.hits.entries()) {
        if (now - record.resetTime > this.windowMs) {
          this.hits.delete(key);
        }
      }
    }, 60 * 1000);
    if (cleanupTimer.unref) cleanupTimer.unref();
  }

  isLimited(key) {
    const now = Date.now();
    let record = this.hits.get(key);

    if (!record || now - record.resetTime > this.windowMs) {
      record = { count: 1, resetTime: now };
      this.hits.set(key, record);
      return false;
    }

    record.count++;
    if (record.count > this.maxHits) {
      return true;
    }
    return false;
  }

  middleware(message = 'Too many requests, please try again later.') {
    return (req, res, next) => {
      const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
      const key = `${req.path}:${clientIp}`;
      if (this.isLimited(key)) {
        return res.status(429).json({ error: message });
      }
      next();
    };
  }
}

// Preconfigured rate limiters
const generalApiLimiter = new RateLimiter(60 * 1000, 150);      // 150 requests / min
const uploadLimiter = new RateLimiter(60 * 1000, 20);            // 20 uploads / min
const orderCreateLimiter = new RateLimiter(60 * 1000, 30);       // 30 orders / min
const pinVerifyLimiter = new RateLimiter(15 * 60 * 1000, 5);     // 5 attempts / 15 min per IP

/**
 * 4. Magic Bytes File Verification (Check file signature)
 */
function validateFileBuffer(buffer, mimeType) {
  if (!buffer || buffer.length < 8) return false;

  // PDF Magic Bytes: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46 && buffer[4] === 0x2D;

  // PNG Magic Bytes: 89 50 4E 47 0D 0A 1A 0A
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
                buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A;

  // JPEG Magic Bytes: FF D8 FF
  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;

  if (mimeType === 'application/pdf') {
    return isPdf;
  }
  if (mimeType === 'image/png') {
    return isPng;
  }
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return isJpeg;
  }

  // Fallback: accept if either PDF or valid image
  return isPdf || isPng || isJpeg;
}

/**
 * 5. Input Sanitizers & Protections
 */
function sanitizeId(id) {
  if (!id || typeof id !== 'string') return '';
  return id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 64);
}

function sanitizeText(str, maxLength = 120) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[<>'"&]/g, '') // strip dangerous HTML chars
    .trim()
    .slice(0, maxLength);
}

function sanitizeFilename(name) {
  if (!name || typeof name !== 'string') return 'document.pdf';
  // Strip path traversal and weird chars
  return name
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\.\./g, '_')
    .trim()
    .slice(0, 100);
}

function sanitizePositiveInt(val, min = 1, max = 500, defaultVal = 1) {
  const num = parseInt(val, 10);
  if (isNaN(num) || num < min) return defaultVal;
  if (num > max) return max;
  return num;
}

function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    return clean.slice(0, 3) + '****' + clean.slice(7);
  }
  return clean.slice(0, 2) + '****' + clean.slice(-2);
}

/**
 * 6. Strip Prototype Pollution Keys
 */
function cleanObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    if (typeof value === 'object' && value !== null) {
      clean[key] = cleanObject(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * 7. Shopkeeper Authentication Middleware
 */
function requireShopAuth(req, res, next) {
  const shopId = sanitizeId(req.params.shopId || req.body.shopId || req.query.shopId);
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : (req.query.token || req.headers['x-shop-token']);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please unlock your shop dashboard with your Owner PIN.' });
  }

  const payload = verifyToken(token);
  if (!payload || payload.shopId !== shopId) {
    return res.status(403).json({ error: 'Invalid or expired session. Please re-enter your Owner PIN.' });
  }

  req.shopAuth = payload;
  next();
}

/**
 * 8. HTTP Security Headers Middleware
 */
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.removeHeader('X-Powered-By');
  next();
}

module.exports = {
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
  cleanObject,
  requireShopAuth,
  securityHeaders
};
