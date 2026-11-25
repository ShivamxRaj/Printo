const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FFMPEG_PATH = 'D:\\music\\node_modules\\ffmpeg-static\\ffmpeg.exe';
const PROMO_HTML_PATH = 'E:\\Printo — Motion Promo.html';
const OUTPUT_MP4 = 'E:\\Printo — Motion Promo.mp4';
const OUTPUT_STORY_MP4 = 'E:\\Printo — Story (9-16).mp4';
const PORT = 8899;

// 1. Simple local HTTP server to serve the HTML and assets without file:// sandbox restrictions
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url.startsWith('/promo')) {
    const content = fs.readFileSync(PROMO_HTML_PATH, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(content);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, async () => {
  console.log(`Local server running on port ${PORT}`);
  try {
    await recordVideo();
  } catch (err) {
    console.error('Recording error:', err);
  } finally {
    server.close();
  }
});

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function recordVideo() {
  console.log('Launching headless Chrome...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--window-size=1920,1080',
    '--disable-gpu',
    '--hide-scrollbars',
    '--mute-audio',
    `http://localhost:${PORT}/promo`
  ]);

  // Wait for remote debugging to open
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const res = await fetch('http://127.0.0.1:9222/json/list');
      const data = await res.json();
      const page = data.find(d => d.type === 'page' && d.url.includes(`localhost:${PORT}`));
      if (page && page.webSocketDebuggerUrl) {
        wsUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch (_) {}
  }

  if (!wsUrl) {
    chrome.kill();
    throw new Error('Failed to connect to Chrome CDP WebSocket');
  }

  console.log('Connected to Chrome via CDP:', wsUrl);
  const ws = new WebSocket(wsUrl);

  let idCounter = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise((resolve) => {
    if (ws.readyState === WebSocket.OPEN) resolve();
    else ws.onopen = resolve;
  });

  console.log('Configuring viewport 1920x1080...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });

  console.log('Waiting for fonts and GSAP to load...');
  await send('Runtime.evaluate', {
    expression: 'document.fonts.ready',
    awaitPromise: true
  });
  await sleep(1000);

  // Pause timeline and get duration
  const evalResult = await send('Runtime.evaluate', {
    expression: `
      (function() {
        if (typeof tl !== 'undefined') {
          tl.pause();
          return tl.duration();
        }
        return 24.8;
      })()
    `,
    returnByValue: true
  });

  const duration = evalResult.result?.value || 24.8;
  console.log(`Timeline duration: ${duration}s`);

  const fps = 30;
  const totalFrames = Math.ceil(duration * fps);
  console.log(`Total frames to render: ${totalFrames} (FPS: ${fps})`);

  // Start FFmpeg process
  console.log(`Spawning FFmpeg to render: ${OUTPUT_MP4}`);
  const ffmpeg = spawn(FFMPEG_PATH, [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-framerate', String(fps),
    '-i', '-',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'fast',
    '-crf', '18',
    OUTPUT_MP4
  ]);

  ffmpeg.stderr.on('data', () => {}); // silence pipe logs
  ffmpeg.on('error', (err) => console.error('FFmpeg error:', err));

  const startTime = Date.now();
  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frame / fps;
    
    // Seek GSAP timeline
    await send('Runtime.evaluate', {
      expression: `tl.seek(${t.toFixed(4)}, false); apply();`
    });

    // Capture exact frame
    const screenshot = await send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true
    });

    const buf = Buffer.from(screenshot.data, 'base64');
    
    // Write frame to ffmpeg stdin with drain backpressure
    const canWrite = ffmpeg.stdin.write(buf);
    if (!canWrite) {
      await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
    }

    if (frame % 60 === 0 || frame === totalFrames - 1) {
      const pct = Math.round((frame / totalFrames) * 100);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`Rendering: ${pct}% (frame ${frame + 1}/${totalFrames}) - ${elapsed}s elapsed`);
    }
  }

  ffmpeg.stdin.end();

  await new Promise((resolve, reject) => {
    ffmpeg.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
  });

  console.log(`✅ 16:9 Landscape MP4 exported: ${OUTPUT_MP4}`);

  // Now create the 9:16 Story format for WhatsApp/Instagram Story
  console.log(`Creating 9:16 Vertical Story version: ${OUTPUT_STORY_MP4}...`);
  await new Promise((resolve, reject) => {
    const storyFfmpeg = spawn(FFMPEG_PATH, [
      '-y',
      '-i', OUTPUT_MP4,
      '-vf', 'split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,boxblur=25:5,crop=1080:1920[bg];[b]scale=1080:1920:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      '-crf', '18',
      OUTPUT_STORY_MP4
    ]);

    storyFfmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ 9:16 Vertical Story MP4 exported: ${OUTPUT_STORY_MP4}`);
        resolve();
      } else {
        reject(new Error(`Story FFmpeg failed with code ${code}`));
      }
    });
  });

  ws.close();
  chrome.kill();
  console.log('🎉 ALL DONE! Both videos are ready in E:\\');
}

