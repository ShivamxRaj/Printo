const assert = require('assert');
const {
  createToken,
  verifyToken,
  getAgentAuthKey,
  validateFileBuffer,
  cleanObject,
  sanitizePositiveInt,
  sanitizeId,
  maskPhone
} = require('./security');
const db = require('./db');

console.log('🧪 Starting Printo Automated Security Test Suite...\n');

// 1. Token Generation & Verification
console.log('Test 1: HMAC SHA-256 Token Generation & Expiration...');
const token = createToken({ shopId: 'shivam', role: 'shopkeeper' });
assert(token && typeof token === 'string', 'Token should be a non-empty string');
const verified = verifyToken(token);
assert(verified && verified.shopId === 'shivam', 'Token payload should match');

// Test expired token
const expiredToken = createToken({ shopId: 'shivam' }, -1000);
assert(verifyToken(expiredToken) === null, 'Expired token must return null');

// Test tampered token
const tamperedToken = token.slice(0, -4) + 'abcd';
assert(verifyToken(tamperedToken) === null, 'Tampered token must be rejected');
console.log('✓ Token generation, validation, and tampering protection passed.');

// 2. Secret Leak Prevention (PIN must not be exposed in public endpoints)
console.log('\nTest 2: Secret Leaks (Shop PIN protection in DB queries)...');
const publicShops = db.getAllShops(false);
for (const shop of publicShops) {
  assert(shop.pin === undefined, `CRITICAL: Shop PIN leaked in public list for ${shop.id}!`);
}
const publicShivam = db.getShop('shivam', false);
assert(publicShivam.pin === undefined, 'CRITICAL: Shop PIN leaked in public getShop!');

const secretShivam = db.getShop('shivam', true);
assert(secretShivam.pin !== undefined, 'Internal shop lookup must retain PIN for verification');
console.log('✓ Shop PIN is strictly stripped from all public shop queries.');

// 3. Magic Bytes File Validation (Check #12)
console.log('\nTest 3: Magic Bytes & Anti-Executable Upload Check...');
// Fake PDF (plain text claiming to be PDF)
const fakePdfBuffer = Buffer.from('console.log("I am a malicious script");');
assert(!validateFileBuffer(fakePdfBuffer, 'application/pdf'), 'Fake PDF must be rejected');

// Real PDF header
const realPdfBuffer = Buffer.from('%PDF-1.4\n%real pdf content here...');
assert(validateFileBuffer(realPdfBuffer, 'application/pdf'), 'Legitimate PDF must be accepted');

// Real PNG header
const realPngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00]);
assert(validateFileBuffer(realPngBuffer, 'image/png'), 'Legitimate PNG must be accepted');

// Executable EXE header (MZ) claiming to be PNG
const exeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
assert(!validateFileBuffer(exeBuffer, 'image/png'), 'EXE disguised as PNG must be rejected');
console.log('✓ Magic bytes validation strictly blocks dangerous disguised uploads.');

// 4. Prototype Pollution & Mass Assignment Defense (Check #24, #29)
console.log('\nTest 4: Prototype Pollution & Mass Assignment Sanitization...');
const dirtyInput = JSON.parse('{"name":"Shivam Safe","__proto__":{"polluted":true},"admin":true}');
const cleaned = cleanObject(dirtyInput);
assert(cleaned.__proto__ === Object.prototype, 'Prototype pollution keys must be neutralized');
assert({}.polluted === undefined, 'Object prototype must NOT be polluted');
console.log('✓ Prototype pollution protection verified.');

// 5. Negative Quantity & Integer Validation (Check #4, #5)
console.log('\nTest 5: Price & Quantity Bounds Validation...');
assert.strictEqual(sanitizePositiveInt('-5', 1, 500, 1), 1, 'Negative quantity must default to 1');
assert.strictEqual(sanitizePositiveInt('0', 1, 500, 1), 1, 'Zero quantity must default to 1');
assert.strictEqual(sanitizePositiveInt('999999', 1, 500, 1), 500, 'Extreme quantity must clamp to 500');
assert.strictEqual(sanitizePositiveInt('3', 1, 500, 1), 3, 'Valid integer must be preserved');
console.log('✓ Quantity and price boundary exploits prevented.');

// 6. Privacy & PII Protection (Customer Phone Masking)
console.log('\nTest 6: PII Masking...');
const masked = maskPhone('6299446452');
assert.strictEqual(masked, '629****452', 'Customer phone numbers must be masked for public order status');
console.log('✓ Customer PII masking verified.');

// 7. Deterministic Agent Key Generation
console.log('\nTest 7: Secure Agent Auth Key Generation...');
const key1 = getAgentAuthKey('shivam', '4652');
const key2 = getAgentAuthKey('shivam', '4652');
const keyWrong = getAgentAuthKey('shivam', 'wrong');
assert(key1 === key2 && key1.length === 32, 'Agent key must be deterministic 32-char hex');
assert(key1 !== keyWrong, 'Different PIN must produce different agent key');
console.log('✓ Desktop print agent cryptographic authentication verified.');

console.log('\n🎉 ALL SECURITY REGRESSION TESTS PASSED SUCCESSFULLY! (100% Pass Rate)\n');

