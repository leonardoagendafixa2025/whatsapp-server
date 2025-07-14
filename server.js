const express = require('express');
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const qrcode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 8000;

// Autenticação salva no arquivo auth_info.json
const { state, saveState } = useSingleFileAuthState('./auth_info.json');

let latestQr = null;

// Função para iniciar o socket WhatsApp
async function startSock() {
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: ['Ubuntu', 'Chrome', '22.04.4']
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      latestQr = qr;
      console.log('✅ Novo QR gerado.');
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error = Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('🔌 Conexão fechada. Reconectando?', shouldReconnect);
      if (shouldReconnect) startSock();
    } else if (connection === 'open') {
      console.log('✅ Conectado ao WhatsApp!');
    }
  });

  sock.ev.on('creds.update', saveState);
}

// Rota para exibir o QR code como imagem
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

// Inicia servidor Express
app.listen(PORT, () => {
  console.log(`🔌 Backend rodando na porta ${PORT}`);
  startSock();
});
