/**
 * Smart Shelf — WhatsApp Service
 * Self-hosted WhatsApp messaging via whatsapp-web.js
 * (Configured for WhatsApp Personal & WhatsApp Business accounts)
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;

// Prevent background auth promise rejections from crashing the process
process.on('unhandledRejection', (reason) => {
    console.error('[WhatsApp Service] Handled background rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[WhatsApp Service] Handled uncaught exception:', err.message);
});

function findBrowserExecutable() {
    if (process.env.CHROMIUM_PATH && fs.existsSync(process.env.CHROMIUM_PATH)) {
        console.log(`[WhatsApp] Using env CHROMIUM_PATH: ${process.env.CHROMIUM_PATH}`);
        return process.env.CHROMIUM_PATH;
    }
    const candidatePaths = [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ];
    for (const browserPath of candidatePaths) {
        if (fs.existsSync(browserPath)) {
            console.log(`[WhatsApp] Using installed browser executable: ${browserPath}`);
            return browserPath;
        }
    }
    console.log('[WhatsApp] No system Chrome/Edge path found; falling back to Puppeteer default.');
    return undefined;
}

const app = express();
app.use(express.json());

const executablePath = findBrowserExecutable();

const clientOptions = {
    authStrategy: new LocalAuth({ dataPath: process.env.WWEBJS_AUTH_PATH || './wwebjs_auth' }),
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1018949069-alpha.html',
    },
    puppeteer: {
        headless: true,
        protocolTimeout: 90000,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        ],
        ...(executablePath ? { executablePath } : {}),
    },
};

const client = new Client(clientOptions);

let isReady = false;
let currentQRDataUrl = null;

client.on('qr', async (qr) => {
    console.log('\n==================================================');
    console.log('  📱 NEW QR CODE GENERATED!');
    console.log('  Open http://localhost:3001/qr in your browser to scan!');
    console.log('==================================================\n');
    qrcodeTerminal.generate(qr, { small: true });

    try {
        currentQRDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
        
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Smart Shelf — Scan WhatsApp QR</title>
    <meta http-equiv="refresh" content="15">
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 2rem; border-radius: 1rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); text-align: center; max-width: 420px; border: 1px solid #334155; }
        h1 { color: #22c55e; margin-top: 0; font-size: 1.5rem; }
        img { width: 280px; height: 280px; border-radius: 0.5rem; background: white; padding: 10px; }
        .instructions { text-align: left; font-size: 0.9rem; color: #94a3b8; margin-top: 1rem; line-height: 1.5; }
        .badge { background: #064e3b; color: #34d399; padding: 4px 12px; border-radius: 9999px; font-size: 0.8rem; font-weight: bold; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🟢 Smart Shelf WhatsApp Link</h1>
        <span class="badge">Awaiting Scan...</span>
        <p style="margin: 1rem 0;">Scan with WhatsApp or WhatsApp Business:</p>
        <img src="${currentQRDataUrl}" alt="WhatsApp QR Code" />
        <div class="instructions">
            <strong>How to link WhatsApp Business:</strong><br/>
            1. Open WhatsApp / WhatsApp Business on phone.<br/>
            2. Tap <strong>⋮ Menu / Settings</strong> ➔ <strong>Linked Devices</strong>.<br/>
            3. Tap <strong>Link a Device</strong> and point camera here.
        </div>
    </div>
</body>
</html>`;
        fs.writeFileSync(path.join(__dirname, 'qr.html'), htmlContent);
    } catch (e) {
        console.error('Failed to generate PNG QR Code:', e);
    }
});

client.on('ready', () => {
    isReady = true;
    currentQRDataUrl = null;
    console.log('\n✅ WhatsApp client successfully authenticated & ready!');
    console.log('Service listening for messaging requests on port', PORT);
});

client.on('disconnected', (reason) => {
    isReady = false;
    currentQRDataUrl = null;
    console.error('[WhatsApp] Client disconnected:', reason);
    console.log('[WhatsApp] Restarting client...');
    client.initialize();
});

client.on('auth_failure', (msg) => {
    console.error('[WhatsApp] Auth failure:', msg);
});

// GET /qr - Render clean HTML QR Code page
app.get('/qr', (req, res) => {
    if (isReady) {
        return res.send(`
        <body style="font-family: sans-serif; background: #0f172a; color: #22c55e; display: flex; align-items: center; justify-content: center; height: 100vh;">
            <div style="text-align: center; background: #1e293b; padding: 2rem; border-radius: 1rem;">
                <h2>✅ WhatsApp Already Linked & Ready!</h2>
                <p style="color: #94a3b8;">Smart Shelf messaging is active.</p>
            </div>
        </body>`);
    }

    if (!currentQRDataUrl) {
        return res.send(`
        <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh;">
            <div style="text-align: center; background: #1e293b; padding: 2rem; border-radius: 1rem;">
                <h2>⏳ Generating QR Code...</h2>
                <p style="color: #94a3b8;">Please refresh this page in 3 seconds.</p>
                <script>setTimeout(() => location.reload(), 3000);</script>
            </div>
        </body>`);
    }

    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Smart Shelf — Scan WhatsApp QR</title>
    <meta http-equiv="refresh" content="10">
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 2rem; border-radius: 1rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); text-align: center; max-width: 420px; border: 1px solid #334155; }
        h1 { color: #22c55e; margin-top: 0; font-size: 1.5rem; }
        img { width: 280px; height: 280px; border-radius: 0.5rem; background: white; padding: 10px; }
        .instructions { text-align: left; font-size: 0.9rem; color: #94a3b8; margin-top: 1rem; line-height: 1.5; }
        .badge { background: #064e3b; color: #34d399; padding: 4px 12px; border-radius: 9999px; font-size: 0.8rem; font-weight: bold; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🟢 Smart Shelf WhatsApp Link</h1>
        <span class="badge">Awaiting Scan...</span>
        <p style="margin: 1rem 0;">Scan with WhatsApp or WhatsApp Business:</p>
        <img src="${currentQRDataUrl}" alt="WhatsApp QR Code" />
        <div class="instructions">
            <strong>How to link WhatsApp Business:</strong><br/>
            1. Open WhatsApp / WhatsApp Business on phone.<br/>
            2. Tap <strong>⋮ Menu / Settings</strong> ➔ <strong>Linked Devices</strong>.<br/>
            3. Tap <strong>Link a Device</strong> and point camera at image above.
        </div>
    </div>
</body>
</html>`);
});

// POST /send-message
app.post('/send-message', async (req, res) => {
    const { phone, message } = req.body;

    if (!phone || !message) {
        return res.status(400).json({ success: false, error: 'Missing phone or message field' });
    }

    if (!isReady) {
        console.error('[WhatsApp] Send attempted but client not ready yet. Has QR been scanned?');
        return res.status(503).json({ success: false, error: 'WhatsApp client not ready. Please scan QR code first.' });
    }

    const chatId = `${phone}@c.us`;

    try {
        await client.sendMessage(chatId, message);
        console.log(`[WhatsApp] ✅ Sent to ${phone}: ${message.substring(0, 50)}...`);
        return res.json({ success: true });
    } catch (err) {
        console.error(`[WhatsApp] ❌ Failed to send to ${phone}:`, err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: isReady ? 'ready' : 'waiting_for_qr' });
});

app.listen(PORT, () => {
    console.log(`\n🚀 Smart Shelf WhatsApp Service starting on http://localhost:${PORT}`);
    console.log(`📱 QR Web Page available at: http://localhost:${PORT}/qr\n`);
});

client.initialize();
