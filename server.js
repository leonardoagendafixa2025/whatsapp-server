const express = require('express')
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const pino = require('pino')
const qrcode = require('qrcode')

const app = express()
const port = process.env.PORT || 8000

let currentQr = null

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const sock = makeWASocket({
    printQRInTerminal: false,
    auth: state,
    logger: pino({ level: 'silent' })
  })

  sock.ev.on('connection.update', async (update) => {
    const { connection, qr } = update
    if (qr) {
      currentQr = await qrcode.toDataURL(qr)
      console.log('✅ Novo QR gerado.')
    }

    if (connection === 'open') {
      console.log('🟢 Conectado com sucesso ao WhatsApp!')
    }
  })

  sock.ev.on('creds.update', saveCreds)
}

startWhatsApp()

app.get('/', (req, res) => {
  res.send('✅ WhatsApp Backend Online!')
})

app.get('/qr', (req, res) => {
  if (!currentQr) return res.send('🔄 Aguardando geração do QR Code...')
  res.send(`<img src="${currentQr}" style="width:300px;height:300px;" />`)
})

app.listen(port, () => {
  console.log(`🔌 Backend rodando na porta ${port}`)
})