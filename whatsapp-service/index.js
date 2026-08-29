/**
 * Smart Shelf — WhatsApp Service (Baileys Lightweight Node.js Implementation)
 * Zero Chromium / Zero Puppeteer required — Works instantly on all Cloud platforms.
 */

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const express = require('express');
const QRCode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;
const AUTH_DIR = process.env.WWEBJS_AUTH_PATH || path.join(__dirname, 'baileys_auth');

const app = express();
app.use(express.json());

let sock = null;
let isReady = false;
let currentQRDataUrl = null;

async function startBaileys() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('\n==================================================');
                console.log('  📱 NEW WHATSAPP QR CODE GENERATED!');
                console.log('  Open http://localhost:3001/qr in your browser to scan!');
                console.log('==================================================\n');
                qrcodeTerminal.generate(qr, { small: true });

                try {
                    currentQRDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
                } catch (err) {
                    console.error('[WhatsApp] Failed to generate QR data URL:', err);
                }
            }

            if (connection === 'open') {
                isReady = true;
                currentQRDataUrl = null;
                console.log('\n✅ WhatsApp client successfully authenticated & ready!');
                console.log('Service listening for messaging requests on port', PORT);
            }

            if (connection === 'close') {
                isReady = false;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.log(`[WhatsApp] Connection closed. Reason code: ${statusCode}. Reconnecting: ${shouldReconnect}`);

                if (shouldReconnect) {
                    setTimeout(startBaileys, 3000);
                } else {
                    console.log('[WhatsApp] Logged out. Clearing credentials to allow new QR scan...');
                    if (fs.existsSync(AUTH_DIR)) {
                        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
                    }
                    setTimeout(startBaileys, 3000);
                }
            }
        });
    } catch (err) {
        console.error('[WhatsApp] Failed to start Baileys:', err);
        setTimeout(startBaileys, 5000);
    }
}

function formatPhoneJid(rawPhone) {
    let clean = rawPhone.replace(/\D/g, '');
    if (clean.length === 10) {
        clean = '91' + clean;
    }
    return `${clean}@s.whatsapp.net`;
}

// GET /qr - Render clean HTML QR Code page
app.get('/qr', (req, res) => {
    if (isReady) {
        return res.send(`
        <body style="font-family: system-ui, sans-serif; background: #0f172a; color: #22c55e; display: flex; align-items: center; justify-content: center; height: 100vh; margin:0;">
            <div style="text-align: center; background: #1e293b; padding: 2.5rem; border-radius: 1.5rem; border: 1px solid #334155; max-width: 400px;">
                <h2 style="margin-top:0;">✅ WhatsApp Linked & Ready!</h2>
                <p style="color: #94a3b8; font-size: 0.95rem;">Smart Shelf automated messaging is active.</p>
                <div style="background: #064e3b; color: #34d399; padding: 8px 16px; border-radius: 9999px; font-weight: bold; display: inline-block; margin-top: 0.5rem; font-size: 0.85rem;">
                    Status: Connected
                </div>
            </div>
        </body>`);
    }

    if (!currentQRDataUrl) {
        return res.send(`
        <body style="font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin:0;">
            <div style="text-align: center; background: #1e293b; padding: 2.5rem; border-radius: 1.5rem; border: 1px solid #334155; max-width: 400px;">
                <h2 style="margin-top:0; color: #38bdf8;">⌛ Generating QR Code...</h2>
                <p style="color: #94a3b8; font-size: 0.95rem;">Initializing WhatsApp service. Page reloads automatically in 3s.</p>
                <script>setTimeout(() => location.reload(), 3000);</script>
            </div>
        </body>`);
    }

    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Smart Shelf — Scan WhatsApp QR</title>
    <meta http-equiv="refresh" content="12">
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 2rem; border-radius: 1.5rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); text-align: center; max-width: 420px; border: 1px solid #334155; }
        h1 { color: #22c55e; margin-top: 0; font-size: 1.5rem; }
        img { width: 280px; height: 280px; border-radius: 0.75rem; background: white; padding: 12px; }
        .instructions { text-align: left; font-size: 0.9rem; color: #94a3b8; margin-top: 1.25rem; line-height: 1.5; }
        .badge { background: #064e3b; color: #34d399; padding: 4px 14px; border-radius: 9999px; font-size: 0.8rem; font-weight: bold; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🟢 Smart Shelf WhatsApp Link</h1>
        <span class="badge">Awaiting Scan...</span>
        <p style="margin: 1rem 0;">Scan with WhatsApp or WhatsApp Business:</p>
        <img src="${currentQRDataUrl}" alt="WhatsApp QR Code" />
        <div class="instructions">
            <strong>How to link WhatsApp:</strong><br/>
            1. Open WhatsApp / WhatsApp Business on phone.<br/>
            2. Tap <strong>⋮ Menu / Settings</strong> ➔ <strong>Linked Devices</strong>.<br/>
            3. Tap <strong>Link a Device</strong> and point camera at QR code above.
        </div>
    </div>
</body>
</html>`);
});

// POST /send-message
app.post('/send-message', async (req, res) => {
    const { phone_number, message } = req.body;

    if (!phone_number || !message) {
        return res.status(400).json({ error: 'phone_number and message are required' });
    }

    if (!isReady || !sock) {
        return res.status(503).json({ error: 'WhatsApp client is not ready. Please scan QR code first.' });
    }

    try {
        const jid = formatPhoneJid(phone_number);
        await sock.sendMessage(jid, { text: message });
        console.log(`[WhatsApp] ✅ Sent message to ${phone_number}`);
        return res.json({ success: true });
    } catch (err) {
        console.error(`[WhatsApp] ❌ Failed to send to ${phone_number}:`, err.message);
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
    startBaileys();
});
