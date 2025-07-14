const express = require('express');
const { Boom } = require('@hapi/boom');
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useSingleFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 8000;

const { state, saveState } = useSingleFileAuthState('./auth_info.json');

let sock;
let latestQr = null;

// Inicializa o WhatsApp
async function startSock() {
  sock = makeWASocket({
    printQRInTerminal: false,
    auth: state,
    browser: ['Ubuntu', 'Chrome', '22.04.4']
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      latestQr = qr;
      console.log('✅ Novo QR gerado.');
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error = Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('❌ Conexão fechada. Reconectando?', shouldReconnect);
      if (shouldReconnect) startSock();
    } else if (connection === 'open') {
      console.log('✅ Conectado ao WhatsApp!');
    }
  });
}

// Inicia o servidor
app.get('/', (req, res) => {
  res.send('Servidor WhatsApp Online!');
});

// Rota para exibir o QR code como PNG
app.get('/qr', async (req, res) => {
  if (!latestQr) {
    return res.status(404).send('QR ainda não gerado.');
  }

  try {
    const qrImage = await qrcode.toBuffer(latestQr);
    res.setHeader('Content-Type', 'image/png');
    res.send(qrImage);
  } catch (err) {
    res.status(500).send('Erro ao gerar QR code.');
  }
});

app.listen(PORT, () => {
  console.log(`🔌 Backend rodando na porta ${PORT}`);
  startSock();
});
