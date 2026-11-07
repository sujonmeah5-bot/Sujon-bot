const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const pino = require("pino")
const config = require("./config")

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session")
  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    auth: state,
    browser: ["SUJON - BOT", "Chrome", "1.0"]
  })

  let pairingDone = false

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update

   if (!sock.authState.creds.registered) {
  console.log("Waiting for pairing, retry in 15 sec...")
  setTimeout(() => startBot(), 15000)
  return
}
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(config.ownerNumber)
          console.log("PAIRING CODE:", code)
        } catch (e) {
          console.log("Pairing failed:", e.message)
          pairingDone = false
        }
      }, 3000)
    }

    if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      console.log("Connection closed, reconnecting:", shouldReconnect)
      if (shouldReconnect) {
        if (!sock.authState.creds.registered) {
          console.log("Waiting for pairing, not restarting...")
          return
        }
        startBot()
      }
    } else if (connection === "open") {
      console.log("✅ SUJON - BOT Connected!")
    }
  })

  sock.ev.on("creds.update", saveCreds)
}

startBot()