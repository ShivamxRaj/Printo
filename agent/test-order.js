const http = require('http');

async function testFlow() {
  console.log('--- 1. Testing Price Calculation ---');
  const calcData = JSON.stringify({
    shopId: 'demo-shop',
    docType: 'doc',
    colorMode: 'bw',
    copies: 2,
    sides: 'single',
    pageCount: 3
  });

  const calcRes = await makeRequest('/api/orders/calculate', 'POST', calcData);
  console.log('Calculation Result:', JSON.parse(calcRes));

  console.log('\n--- 2. Creating an Order ---');
  const orderData = JSON.stringify({
    shopId: 'demo-shop',
    tempFileId: 'demo_file',
    fileName: 'Semester_Admit_Card.pdf',
    docType: 'doc',
    colorMode: 'bw',
    copies: 1,
    sides: 'single',
    pageRange: 'all',
    pageCount: 1
  });

  const orderRes = await makeRequest('/api/orders/create', 'POST', orderData);
  const parsedOrder = JSON.parse(orderRes);
  console.log(`Created Order #${parsedOrder.order.orderCode} (ID: ${parsedOrder.order.id})`);
  console.log('UPI Intent URI:', parsedOrder.upiUrl);

  console.log('\n--- 3. Verifying Payment & Triggering Auto-Print ---');
  const verifyRes = await makeRequest(`/api/orders/${parsedOrder.order.id}/verify-payment`, 'POST', JSON.stringify({
    transactionId: 'UPI_TEST_99887766'
  }));
  console.log('Payment Verification Result:', JSON.parse(verifyRes));
}

function makeRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data || '')
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

testFlow();

