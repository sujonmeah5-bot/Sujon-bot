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

  let pairingRequested = false

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === "connecting" && !sock.authState.creds.registered && !pairingRequested) {
      pairingRequested = true
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(config.ownerNumber)
          console.log("PAIRING CODE:", code)
          console.log("Ebar code ta WhatsApp e boshau, bot ar restart hobe na!")
        } catch (e) {
          console.log("Pairing failed:", e.message)
          pairingRequested = false
        }
      }, 3000)
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      console.log("Connection closed, code:", statusCode)
      // Jodi pairing na hoye thake, taile restart korba NA - socket ke beche thakte dao
      if (!sock.authState.creds.registered) {
        console.log("Waiting for pairing... socket alive, restart korbo na")
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