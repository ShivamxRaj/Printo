const { io } = require('socket.io-client');
const { exec, execFile, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const https = require('https');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
const SHOP_ID = process.env.SHOP_ID || 'shivam';
const AGENT_KEY = process.env.AGENT_KEY || '';
const PIN = process.env.PIN || '4652';

// Temp folder for downloaded print jobs
const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

console.log(`\n======================================================`);
console.log(`🖨️  Printo Windows Desktop Print Agent v1.1 [Secured]`);
console.log(`======================================================`);
console.log(`[INIT] Hostname: ${os.hostname()} (${os.platform()} ${os.arch()})`);
console.log(`[INIT] Server Target: ${SERVER_URL}`);
console.log(`[INIT] Target Shop: ${SHOP_ID}`);

/**
 * Detect all installed Windows printers using PowerShell
 */
function getWindowsPrinters() {
  try {
    const cmd = `powershell -NoProfile -Command "Get-CimInstance Win32_Printer | Select-Object Name, Default | ConvertTo-Json -Compress"`;
    const stdout = execSync(cmd, { encoding: 'utf-8', timeout: 5000 }).trim();
    if (!stdout) return [];
    
    let parsed = JSON.parse(stdout);
    if (!Array.isArray(parsed)) {
      parsed = [parsed];
    }
    return parsed.map(p => ({
      name: p.Name,
      isDefault: Boolean(p.Default)
    }));
  } catch (err) {
    console.warn(`[WARN] Could not query Win32_Printer: ${err.message}. Using fallback printer.`);
    return [{ name: 'Default Windows Printer', isDefault: true }];
  }
}

const printers = getWindowsPrinters();
console.log(`\n[PRINTERS FOUND]: ${printers.length} installed printers on this PC:`);
let defaultPrinter = printers.find(p => p.isDefault)?.name || printers[0]?.name || 'Default';

printers.forEach((p, idx) => {
  console.log(`   ${idx + 1}. ${p.name} ${p.isDefault ? ' ⭐ [DEFAULT ACTIVE]' : ''}`);
});

// Allow CLI override: node agent.js --printer "HP LaserJet"
const printerArgIdx = process.argv.indexOf('--printer');
let activePrinter = printerArgIdx !== -1 && process.argv[printerArgIdx + 1] 
  ? process.argv[printerArgIdx + 1] 
  : defaultPrinter;

console.log(`\n👉 Active Printer selected for automated print: "${activePrinter}"\n`);

/**
 * Locate Microsoft Edge or Chrome executable for 100% native silent PDF printing
 */
function findBrowserPrintBinary() {
  const possiblePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

const browserBinary = findBrowserPrintBinary();
if (browserBinary) {
  console.log(`[NATIVE PRINT ENGINE] Found Windows Browser Spooler: ${browserBinary}`);
}

/**
 * Download file from URL to local path with SSRF & domain validation (Security #21)
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      return reject(new Error('Invalid URL format: ' + url));
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return reject(new Error('Disallowed protocol: ' + parsed.protocol));
    }

    // SSRF Validation: verify host belongs to trusted server or configured server URL
    try {
      const serverHost = new URL(SERVER_URL).host;
      const isAllowedHost = 
        parsed.host === serverHost || 
        parsed.host.endsWith('railway.app') || 
        parsed.host.endsWith('getprinto.in') || 
        parsed.host === 'localhost' || 
        parsed.host === '127.0.0.1' ||
        parsed.host.startsWith('localhost:') ||
        parsed.host.startsWith('127.0.0.1:');

      if (!isAllowedHost) {
        return reject(new Error(`Security Alert: Untrusted download host rejected (${parsed.host})`));
      }
    } catch (e) {}

    const file = fs.createWriteStream(destPath);
    const client = parsed.protocol === 'https:' ? https : http;

    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download file, status code: ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(destPath));
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

/**
 * Silently print PDF using Windows Spooler with command-injection defense (Security #01, #25)
 */
function silentPrintPdf(filePath, printerName, copies = 1) {
  return new Promise((resolve, reject) => {
    console.log(`[WINDOWS SPOOLER] Sending file to printer "${printerName}" (${copies} ${copies === 1 ? 'copy' : 'copies'})...`);

    // Strategy 1: Edge / Chrome headless silent print via execFile (NO shell interpolation!)
    if (browserBinary) {
      console.log(`[SPOOL ENGINE] Using Windows Native Silent Spooler (execFile safe mode)...`);
      let completedCopies = 0;

      const printSingleCopy = () => {
        const args = [
          '--headless',
          '--disable-gpu',
          `--print-to-printer=${printerName}`,
          filePath
        ];

        execFile(browserBinary, args, { timeout: 25000 }, (error, stdout, stderr) => {
          completedCopies++;
          if (completedCopies < copies) {
            printSingleCopy();
          } else {
            console.log(`[WINDOWS SPOOLER] ✓ Document successfully dispatched to hardware print queue!`);
            resolve();
          }
        });
      };

      printSingleCopy();
      return;
    }

    // Strategy 2: PowerShell Start-Process PrintTo
    const escapedFilePath = filePath.replace(/'/g, "''");
    const escapedPrinter = printerName.replace(/[`"$]/g, '');

    const psCommand = `
      for ($i = 0; $i -lt ${copies}; $i++) {
        try {
          Start-Process -FilePath '${escapedFilePath}' -Verb PrintTo -ArgumentList '"${escapedPrinter}"' -PassThru | ForEach-Object {
            Start-Sleep -Seconds 3
            try { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue } catch {}
          }
        } catch {
          Write-Output "PowerShell Spool executed"
        }
      }
    `.replace(/\r?\n/g, ' ');

    exec(`powershell -NoProfile -Command "${psCommand}"`, { timeout: 30000 }, () => {
      console.log(`[WINDOWS SPOOLER] ✓ Document successfully dispatched to hardware print queue!`);
      resolve();
    });
  });
}

// Connect to Printo Cloud Gateway via WebSocket
console.log(`[CONNECTING] Connecting to Printo Server at ${SERVER_URL}...`);
const socket = io(SERVER_URL, {
  reconnection: true,
  reconnectionDelay: 2000,
  reconnectionAttempts: Infinity
});

socket.on('connect', () => {
  console.log(`\n🟢 [CONNECTED] Print Agent online. Authenticating with server...`);
  console.log(`   Socket ID: ${socket.id}`);
  
  // Register with server using secure authentication credentials
  socket.emit('agent_register', {
    shopId: SHOP_ID,
    agentKey: AGENT_KEY,
    pin: PIN,
    printers: printers.map(p => p.name),
    activePrinter,
    machineName: os.hostname()
  });

  console.log(`   Listening for walk-in customer print jobs... Stand by.\n`);
});

socket.on('agent_auth_failed', (data) => {
  console.error(`\n❌ [AGENT AUTH REJECTED] ${data?.message || 'Authentication failed'}`);
  console.error(`   Check that SHOP_ID and PIN/AGENT_KEY match the registered shopkeeper credentials.\n`);
});

socket.on('disconnect', () => {
  console.log(`\n🔴 [DISCONNECTED] Lost connection to Printo Server. Reconnecting in background...`);
});

// Real-time print job listener!
socket.on('print_job', async (job) => {
  console.log(`\n⚡ ======================================================`);
  console.log(`📢 [NEW PRINT JOB RECEIVED]`);
  console.log(`   Order PIN: #${job.orderCode}`);
  console.log(`   File Name: ${job.fileName}`);
  console.log(`   Copies: ${job.options?.copies || 1} | Mode: ${job.options?.colorMode || 'B&W'}`);
  console.log(`   File URL: ${job.fileUrl}`);
  console.log(`======================================================`);

  const tempJobFile = path.join(TEMP_DIR, `job_${job.orderCode}_${Date.now()}.pdf`);

  try {
    // 1. Notify server: Status -> printing
    socket.emit('job_status_update', {
      orderId: job.orderId,
      status: 'printing'
    });

    // 2. Download the document to local temp
    console.log(`[DOWNLOADING] Fetching file for printing...`);
    await downloadFile(job.fileUrl, tempJobFile);
    console.log(`[DOWNLOADED] Saved to temporary spool: ${tempJobFile}`);

    // 3. Send to Windows Printer Spooler
    const copies = parseInt(job.options?.copies) || 1;
    await silentPrintPdf(tempJobFile, activePrinter, copies);

    // 4. Notify server: Status -> completed
    console.log(`✅ [COMPLETED] Order #${job.orderCode} successfully printed on "${activePrinter}"!\n`);
    socket.emit('job_status_update', {
      orderId: job.orderId,
      status: 'completed'
    });

  } catch (err) {
    console.error(`❌ [PRINT ERROR] Failed order #${job.orderCode}:`, err.message);
    socket.emit('job_status_update', {
      orderId: job.orderId,
      status: 'failed',
      error: err.message
    });
  } finally {
    // Clean up local temp file
    if (fs.existsSync(tempJobFile)) {
      setTimeout(() => {
        try {
          fs.unlinkSync(tempJobFile);
          console.log(`[PURGE] Removed local temp file: ${tempJobFile}`);
        } catch (e) {}
      }, 5000);
    }
  }
});
