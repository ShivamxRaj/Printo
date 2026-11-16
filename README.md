# 🖨️ PrintKwik — Smart Self-Service Printing SaaS Platform

PrintKwik is a complete, automated SaaS solution built for Cyber Cafes, Xerox shops, university printing corners, and stationery stores. It eliminates manual file handling (WhatsApp/pendrive), long queues, and cash exchange friction.

---

## 🚀 How It Works (The Full Cycle)

```mermaid
flowchart LR
    A["Walk-in Customer"] -->|"Scans Counter QR"| B["Mobile Web App (No install)"]
    B -->|"Upload Doc or ID Card"| C["Select B&W / Color & Copies"]
    C -->|"1-Tap UPI Intent"| D["GPay / PhonePe / Paytm"]
    D -->|"Verified Instant Payment"| E["PrintKwik Cloud Gateway"]
    E -->|"WebSocket Event"| F["Windows Desktop Print Agent"]
    F -->|"Silent Spooler"| G["Fresh Paper from Printer!"]
```

1. **Customer Scans Counter QR Code:** Opens a blazing-fast, mobile-optimized web app directly in their smartphone browser (zero app install required).
2. **Uploads File or Smart Aadhaar/ID Card:**
   - **Standard Document:** PDFs, Images, Word documents. Instant page count detection.
   - **Smart Aadhaar / ID Card:** Customer uploads Front and Back photos; the system automatically merges and aligns both sides onto a single A4 sheet with cutting guide borders.
3. **Selects Print Options & Calculates Live Bill:**
   - Color Mode (Black & White vs Full Color)
   - Copies Count (1, 2, 3...)
   - Print Sides (Single Sided vs Double Sided)
   - Real-time bill breakdown calculated based on shopkeeper's configured rates.
4. **Direct UPI Payment:**
   - 1-tap launcher for **Google Pay**, **PhonePe**, **Paytm**, or any UPI app.
   - Shows dynamic UPI QR for cross-device scanning.
   - Bank verification guarantees zero fraud.
5. **Instant Automated Printing:**
   - The cloud server transmits the print job to the shopkeeper's **Windows Desktop Print Agent** via real-time WebSockets.
   - The agent uses the native Windows silent print engine to print directly to the shop's printer without any popup or confirmation required from the shopkeeper.
6. **Zero-Storage Auto-Purge:**
   - Uploaded customer documents are permanently deleted 30 seconds after printing for complete customer privacy.
7. **Reprint PIN Protection:**
   - Every order receives a 4-digit PIN (e.g. `#8229`). If paper jams or ink runs out, the shopkeeper can enter this PIN on their dashboard to reprint without double-charging the customer.

---

## 📁 Repository Structure

```
d:\printer\
├── server\                      # Backend API & WebSocket Server
│   ├── routes\api.js            # REST API (orders, uploads, payments, standee)
│   ├── services\pdfService.js   # PDF page counter & Smart ID Card A4 Merger
│   ├── db.js                    # Shop & Order data store
│   ├── uploads\                 # Temporary spool directory (auto-purged)
│   └── server.js                # Express & Socket.IO server (Port 5000)
│
├── client\                      # Modern Vite + React + Tailwind CSS Web App
│   ├── src\
│   │   ├── components\
│   │   │   ├── CustomerView.jsx        # Mobile-first customer print portal
│   │   │   ├── ShopkeeperDashboard.jsx # Shopkeeper revenue, live orders & rates
│   │   │   └── StandeePoster.jsx       # Printable A4 counter QR poster
│   │   ├── App.jsx                     # View switcher
│   │   └── index.css                   # Tailwind v4 styles
│   └── dist\                    # Pre-built production frontend (served by backend)
│
├── agent\                       # Windows Desktop Print Agent
│   ├── agent.js                 # Auto-detects Windows printers & silent spooler
│   └── temp\                    # Local spool download folder (auto-purged)
│
└── start-printkwik.bat          # 1-Click launcher for Windows
```

---

## 🏃 Running the Application

### Option 1: 1-Click Windows Launcher
Double-click:
```cmd
d:\printer\start-printkwik.bat
```

### Option 2: Manual Terminal Startup

**Terminal 1 — Start the Server:**
```cmd
cd d:\printer\server
npm start
```
*(Runs on `http://localhost:5000`)*

**Terminal 2 — Start the Desktop Print Agent:**
```cmd
cd d:\printer\agent
npm start
```
*(Auto-detects all installed printers such as HP, Canon, Epson, Brother, and connects to the server)*

---

## 🌐 URLs to Open in Your Browser

| Role | URL | Description |
| :--- | :--- | :--- |
| **Customer Mobile Web App** | [http://localhost:5000/s/demo-shop](http://localhost:5000/s/demo-shop) | Walk-in customer UI for uploading, paying, and tracking prints. |
| **Shopkeeper Dashboard** | [http://localhost:5000/dashboard](http://localhost:5000/dashboard) | Live orders, reprint with PIN, rate settings, today's revenue. |
| **Printable Counter Standee** | [http://localhost:5000/standee/demo-shop](http://localhost:5000/standee/demo-shop) | Ready-to-print A4 standee poster with dynamic QR code for the shop counter. |

---

## 💡 Hardware & Printer Compatibility
- Works with **ANY printer** already installed on Windows (HP LaserJet 1020, Canon LBP2900, Epson EcoTank, Brother, etc.).
- Uses native Windows Spooler commands so shopkeepers never need to purchase expensive new kiosk hardware!

