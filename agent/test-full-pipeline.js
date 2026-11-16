const fs = require('fs');
const path = require('path');

// Minimal multipart form data builder for Node native fetch
async function runFullPipeline() {
  console.log('====================================================');
  console.log('🧪 TEST: Full Customer Upload -> Pay -> Auto-Print');
  console.log('====================================================');

  // 1. Create a dummy test PDF
  const testPdfPath = path.join(__dirname, 'sample.pdf');
  fs.writeFileSync(testPdfPath, `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << >> /MediaBox [0 0 612 792] >>\nendobj\ntrailer\n<< /Size 4 /Root 1 0 R >>\n%%EOF`);

  // 2. Upload file to /api/orders/upload-doc
  console.log('\n[STEP 1] Customer uploads PDF to server...');
  const fileBlob = new Blob([fs.readFileSync(testPdfPath)], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('document', fileBlob, 'College_Assignment.pdf');

  const uploadRes = await fetch('http://localhost:5000/api/orders/upload-doc', {
    method: 'POST',
    body: formData
  });

  const uploadData = await uploadRes.json();
  console.log('✓ File Uploaded successfully:', uploadData);

  // 3. Customer configures print & creates order
  console.log('\n[STEP 2] Customer selects B&W, 2 copies...');
  const orderRes = await fetch('http://localhost:5000/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shopId: 'demo-shop',
      tempFileId: uploadData.tempFileId,
      fileName: 'College_Assignment.pdf',
      docType: 'doc',
      colorMode: 'bw',
      copies: 2,
      sides: 'single',
      pageRange: 'all',
      pageCount: uploadData.pageCount
    })
  });

  const orderData = await orderRes.json();
  console.log(`✓ Order Created #${orderData.order.orderCode} (Total: ₹${orderData.order.totalAmount})`);
  console.log('  Dynamic UPI Link:', orderData.upiUrl);

  // 4. Simulate UPI Payment
  console.log('\n[STEP 3] Customer completes UPI payment on GPay/PhonePe...');
  const verifyRes = await fetch(`http://localhost:5000/api/orders/${orderData.order.id}/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transactionId: 'UPI_SUCCESS_' + Date.now()
    })
  });

  const verifyData = await verifyRes.json();
  console.log('✓ Payment Verified:', verifyData.order.paymentStatus);
  console.log('  Print Status:', verifyData.order.printStatus);
  console.log('\nWaiting 4 seconds to observe agent execution...');
  await new Promise(r => setTimeout(r, 4000));

  // 5. Check final order status from DB
  const statusRes = await fetch(`http://localhost:5000/api/orders/${orderData.order.id}/status`);
  const finalStatus = await statusRes.json();
  console.log('\n====================================================');
  console.log('🎯 Final Order State:');
  console.log(`   Order Code: #${finalStatus.orderCode}`);
  console.log(`   Payment: ${finalStatus.paymentStatus.toUpperCase()}`);
  console.log(`   Print Status: ${finalStatus.printStatus.toUpperCase()}`);
  console.log(`   Amount: ₹${finalStatus.totalAmount}`);
  console.log('====================================================\n');

  // Clean up local sample
  if (fs.existsSync(testPdfPath)) fs.unlinkSync(testPdfPath);
}

runFullPipeline().catch(console.error);

