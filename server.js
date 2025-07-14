const express = require('express');
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8000;
let latestQr = null;

const { state, saveState } = useSingleFileAuthState('./auth_info.json');

async function startSock() {
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ['Ubuntu', 'Chrome', '22.04.4'],
    });

    sock.ev.on('creds.update', saveState);

    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        if (qr) {
            latestQr = qr;
            console.log('✅ Novo QR gerado.');
        }

        if (connection === 'close') {
            const shouldReconnect = update?.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('🛑 Conexão encerrada. Reconectar:', shouldReconnect);
            if (shouldReconnect) startSock();
        } else if (connection === 'open') {
            console.log('✅ Conectado ao WhatsApp');
        }
    });

    return sock;
}

startSock();

app.get('/qr', async (req, res) => {
    if (!latestQr) {
        return res.status(404).send('QR Code ainda não gerado.');
    }

    try {
        const qrImage = await qrcode.toDataURL(latestQr);
        const img = Buffer.from(qrImage.split(',')[1], 'base64');
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': img.length
        });
        res.end(img);
    } catch (err) {
        console.error('Erro ao gerar imagem QR:', err);
        res.status(500).send('Erro ao gerar QR Code.');
    }
});

app.listen(PORT, () => {
    console.log(`🔌 Servidor rodando na porta ${PORT}`);
});
