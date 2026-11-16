const fs = require('fs');
const path = require('path');

// Test Smart Aadhaar / ID Card auto-merging
async function testIdCardMerging() {
  console.log('====================================================');
  console.log('🧪 TEST: Smart Aadhaar / ID Card Auto-Merge');
  console.log('====================================================');

  // Create 1x1 test PNGs
  const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const frontPath = path.join(__dirname, 'front_test.png');
  const backPath = path.join(__dirname, 'back_test.png');
  fs.writeFileSync(frontPath, tinyPng);
  fs.writeFileSync(backPath, tinyPng);

  const frontBlob = new Blob([tinyPng], { type: 'image/png' });
  const backBlob = new Blob([tinyPng], { type: 'image/png' });

  const formData = new FormData();
  formData.append('front', frontBlob, 'front.png');
  formData.append('back', backBlob, 'back.png');

  console.log('[STEP 1] Uploading Front & Back ID Card photos...');
  const res = await fetch('http://localhost:5000/api/orders/upload-id-card', {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  console.log('✓ ID Card Auto-Merge Response:', data);

  // Check that the merged PDF was created on disk
  const mergedPdfPath = path.join(__dirname, '../server/uploads', `${data.tempFileId}.pdf`);
  const exists = fs.existsSync(mergedPdfPath);
  console.log(`✓ Stitched A4 PDF exists on disk: ${exists} (Size: ${fs.statSync(mergedPdfPath).size} bytes)`);

  // Clean up
  fs.unlinkSync(frontPath);
  fs.unlinkSync(backPath);
  console.log('====================================================\n');
}

testIdCardMerging().catch(console.error);

