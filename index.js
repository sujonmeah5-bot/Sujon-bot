const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const pino = require("pino")
const config = require("./config")
const http = require("http")

// Render ke beche rakhar jonno - eita na thakle Render bot ke mere dey
http.createServer((req, res) => res.end("SUJON - BOT is running")).listen(process.env.PORT || 3000)

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session")
  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    auth: state,
    browser: ["SUJON - BOT", "Chrome", "1.0"]
  })
if (!sock.authState.creds.registered) {
    try {
      const code = await sock.requestPairingCode("8801353425296")
      console.log("PAIRING CODE:", code)
    } catch(e) {
      console.log("Pairing error:", e.message)
    }
}
sock.ev.on("connection.update", async (update) => {
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log("SCAN_QR_START")
      console.log(qr)
      console.log("SCAN_QR_END")
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      console.log("Connection closed, code:", statusCode)
      // Jodi pairing na hoye thake, taile restart korba NA - socket ke beche thakte dao
   if (!sock.authState.creds.registered) {
  console.log("Waiting for pairing, retry in 15 sec...")
  setTimeout(() => startBot(), 15000)
  return
}
        return
      }
      if (statusCode !== DisconnectReason.loggedOut) {
        startBot()
      }
    } else if (connection === "open") {
      console.log("✅ SUJON - BOT Connected!")
    }
  })

  sock.ev.on("creds.update", saveCreds)
}

startBot()