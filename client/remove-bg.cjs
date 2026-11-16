const { Jimp } = require('./node_modules/jimp');

async function run() {
  const image = await Jimp.read('./public/printo-logo.png');
  
  const w = image.bitmap.width;
  const h = image.bitmap.height;
  const data = image.bitmap.data;
  
  // Sample bg from top-left
  const bgR = data[0], bgG = data[1], bgB = data[2];
  console.log(`Image: ${w}x${h}, BG: rgb(${bgR},${bgG},${bgB})`);
  
  const threshold = 35;
  
  // Find actual content bounds (non-background pixels)
  let minX = w, maxX = 0, minY = h, maxY = 0;
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const pr = data[idx], pg = data[idx+1], pb = data[idx+2];
      const isBg = Math.abs(pr-bgR)<threshold && Math.abs(pg-bgG)<threshold && Math.abs(pb-bgB)<threshold;
      if (!isBg) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  
  console.log(`Content bounds: (${minX},${minY}) to (${maxX},${maxY})`);
  console.log(`Content size: ${maxX-minX}x${maxY-minY}`);
  
  // Add small padding
  const pad = 20;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w-1, maxX + pad);
  maxY = Math.min(h-1, maxY + pad);
  
  // Crop to content
  const cropped = image.crop({ x: minX, y: minY, w: maxX-minX, h: maxY-minY });
  
  // Remove background
  cropped.scan(0, 0, cropped.bitmap.width, cropped.bitmap.height, function(x, y, idx) {
    const pr = this.bitmap.data[idx], pg = this.bitmap.data[idx+1], pb = this.bitmap.data[idx+2];
    if (Math.abs(pr-bgR)<threshold && Math.abs(pg-bgG)<threshold && Math.abs(pb-bgB)<threshold) {
      this.bitmap.data[idx+3] = 0;
    }
  });
  
  await cropped.write('./public/printo-logo-transparent.png');
  console.log(`✅ Cropped transparent logo saved! Final size: ${cropped.bitmap.width}x${cropped.bitmap.height}`);
}

run().catch(e => { console.error(e.message); process.exit(1); });
