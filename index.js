const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } = require("@whiskeysockets/baileys")
const pino = require("pino")
const fs = require("fs")
const config = require("./config")

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session")
  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: true,
    auth: state,
    browser: ["SUJON - BOT", "Chrome", "1.0"]
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update
    if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      console.log("Connection closed, reconnecting:", shouldReconnect)
      if (shouldReconnect) startBot()
    } else if (connection === "open") {
      console.log("✅ SUJON - BOT Connected!")
    }
  })

  // Welcome Message
  sock.ev.on("group-participants.update", async (anu) => {
    if (!config.welcome) return
    try {
      let metadata = await sock.groupMetadata(anu.id)
      for (let p of anu.participants) {
        let name = "@" + p.split("@")[0]
        if (anu.action == "add") {
          await sock.sendMessage(anu.id, { text: `👋 Welcome ${name} to *${metadata.subject}* 🎉\n\nType ${config.prefix}menu for commands`, mentions: [p] })
        } else if (anu.action == "remove") {
          await sock.sendMessage(anu.id, { text: `😢 Bye Bye ${name}, abar asba kintu!` })
        }
      }
    } catch(e) {}
  })

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0]
    if (!m.message || m.key.fromMe) return
    const from = m.key.remoteJid
    const isGroup = from.endsWith("@g.us")
    const sender = m.key.participant || m.key.remoteJid
    const body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || ""
    if (!body.startsWith(config.prefix)) return

    const args = body.slice(config.prefix.length).trim().split(/ +/)
    const command = args.shift().toLowerCase()
    const text = args.join(" ")
    const reply = (txt) => sock.sendMessage(from, { text: txt }, { quoted: m })

    // Get group metadata for admin check
    let isAdmin = false, isBotAdmin = false, groupMetadata
    if (isGroup) {
      try {
        groupMetadata = await sock.groupMetadata(from)
        const participants = groupMetadata.participants
        isAdmin = participants.find(p => p.id === sender)?.admin != null
        isBotAdmin = participants.find(p => p.id === sock.user.id)?.admin != null
      } catch(e) {}
    }

    const isOwner = sender.split("@")[0] === config.ownerNumber || sender === config.ownerNumber + "@s.whatsapp.net"

    // ===== MENU =====
    if (command === "menu" || command === "help") {
      return reply(`> *SUJON - BOT* <\n\nBot ta onek fast kaj kore ✨\n\n*📌 GENERAL*\n${config.prefix}menu - Menu dekhba\n${config.prefix}ping - Bot speed\n${config.prefix}owner - Owner info\n${config.prefix}sticker - Photo ke sticker banao\n${config.prefix}joke - Funny joke\n${config.prefix}quote - Motivational quote\n\n*👥 GROUP*\n${config.prefix}tagall - Sobai ke tag\n${config.prefix}kick - Member ber koro\n${config.prefix}add - Member add koro\n${config.prefix}promote - Admin banao\n${config.prefix}demote - Admin theke sorao\n${config.prefix}group open - Group kholo\n${config.prefix}group close - Group bondho\n${config.prefix}link - Group link\n\n*🎲 FUN*\n${config.prefix}truth - Truth question\n${config.prefix}dare - Dare challenge\n${config.prefix}ship - Love % check\n${config.prefix}8ball - Prosno koro\n\n*🤖 OWNER*\n${config.prefix}broadcast - Sobai ke msg\n\nOwner: ${config.ownerName}`)
    }

    if (command === "ping") return reply(`Pong! ⚡\nSpeed: Fast 🔥\nBot: ${config.botName}`)
    if (command === "owner") return reply(`👑 *Owner:* ${config.ownerName}\n📞 Number: ${config.ownerNumber}\n🤖 Bot: ${config.botName}`)

    if (command === "joke") {
      const jokes = ["Teacher: Bolto, kal keno school e aso nai? Student: Sir, ammu bolse bahire corona ache, tai ami ghorei corona te chilam 😂", "Premik: Tumi chara ami bachbo na! Premika: Tahole moro, ami bidhoba hote chai na 😂", "Bou: Tumi amake valobasho? Jamai: Ha. Bou: Tahole phone er password dao! Jamai: Valobasha ar bokami ek na 😂", "Bondhu: Tor exam kemon hoilo? Ami: Khata joma disi, ekhon result Allah vorosha 😂"]
      return reply(jokes[Math.floor(Math.random() * jokes.length)])
    }

    if (command === "quote") {
      const quotes = ["Sofolota ekdine ashe na, kintu ekdin thik e ashe ✨", "Harte harte ekdin jitte sikhba 💪", "Nijer upor biswas rakho, duniya emnei biswas korbe 🔥", "Kosto chara kichu pawa jay na, etai bastob ❤️"]
      return reply(quotes[Math.floor(Math.random() * quotes.length)])
    }

    if (command === "truth") {
      const t = ["Jibone last kake crush khaiso? 😏", "Karo msg dekhe na dekhar van korso kokhono?", "Sobcheye boro mittha ki bolso?", "Kake stalk koro sobcheye beshi? 👀"]
      return reply("😳 *TRUTH:* " + t[Math.floor(Math.random() * t.length)])
    }

    if (command === "dare") {
      const d = ["Group e 'Ami single, keu prem korba?' likhe pathao 😂", "Tomar crush er nam bolo!", "Ekta selfie pathao ekhon e!", "Last chat er screenshot dao (nam muche) 😏"]
      return reply("🔥 *DARE:* " + d[Math.floor(Math.random() * d.length)])
    }

    if (command === "ship") {
      let percent = Math.floor(Math.random() * 101)
      return reply(`❤️ *Love Calculator* ❤️\n\n${text || "Tumi + Tomar Crush"}\n\nLove: ${percent}%\n${percent > 80 ? "Perfect Juti! 💍" : percent > 50 ? "Cholbe, chesta koro! 😍" : "Vaggo kharap! 😢"}`)
    }

    if (command === "8ball") {
      const ans = ["Haan, 100% hobe 🔥", "Na re, hobe na 😢", "Allah vorosha, hoye jabe ✨", "Ektu wait kor, valo hobe ❤️", "Tumi e janো, ami ki bolbo 😏"]
      return reply("🎱 " + ans[Math.floor(Math.random() * ans.length)])
    }

    // ===== STICKER =====
    if (command === "sticker" || command === "s") {
      const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage
      const imgMsg = quoted?.imageMessage || m.message.imageMessage
      if (!imgMsg) return reply("Ekta chobi pathiye caption e .sticker likho!")
      try {
        const stream = await downloadContentFromMessage(imgMsg, "image")
        let buffer = Buffer.from([])
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
        await sock.sendMessage(from, { sticker: buffer }, { quoted: m })
      } catch(e) { reply("Sticker banate problem hoise, abar try koro") }
      return
    }

    // ===== GROUP COMMANDS =====
    if (command === "tagall") {
      if (!isGroup) return reply("Eita sudhu group e cholbe!")
      if (!isAdmin && !isOwner) return reply("Sudhu admin ra use korte parbe!")
      let members = groupMetadata.participants.map(p => p.id)
      let txt = `📢 *TAG ALL* 📢\n\nGroup: ${groupMetadata.subject}\nTotal: ${members.length}\n\n${text ? "Msg: " + text + "\n\n" : ""}` + members.map(v => "@" + v.split("@")[0]).join("\n")
      return sock.sendMessage(from, { text: txt, mentions: members }, { quoted: m })
    }

    if (command === "kick") {
      if (!isGroup) return reply("Group e use koro!")
      if (!isAdmin && !isOwner) return reply("Admin ra sudhu!")
      if (!isBotAdmin) return reply("Amake age admin banao!")
      let target = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.message.extendedTextMessage?.contextInfo?.participant
      if (!target) return reply("Kake kick dibo? Tag koro! Example: .kick @number")
      await sock.groupParticipantsUpdate(from, [target], "remove")
      return reply("Kick done! 👋")
    }

    if (command === "add") {
      if (!isGroup) return reply("Group e use koro!")
      if (!isAdmin && !isOwner) return reply("Admin ra sudhu!")
      if (!isBotAdmin) return reply("Amake age admin banao!")
      if (!text) return reply("Number dao! Example: .add 8801712345678")
      let num = text.replace(/[^0-9]/g, "") + "@s.whatsapp.net"
      await sock.groupParticipantsUpdate(from, [num], "add")
      return reply("Add request pathano hoise!")
    }

    if (command === "promote" || command === "demote") {
      if (!isGroup) return reply("Group e use koro!")
      if (!isAdmin && !isOwner) return reply("Admin ra sudhu!")
      if (!isBotAdmin) return reply("Amake age admin banao!")
      let target = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.message.extendedTextMessage?.contextInfo?.participant
      if (!target) return reply("Kake? Tag koro!")
      await sock.groupParticipantsUpdate(from, [target], command === "promote" ? "promote" : "demote")
      return reply(command === "promote" ? "Admin banano hoise 👑" : "Admin theke sorano hoise!")
    }

    if (command === "group") {
      if (!isGroup) return reply("Group e use koro!")
      if (!isAdmin && !isOwner) return reply("Admin ra sudhu!")
      if (!isBotAdmin) return reply("Amake age admin banao!")
      if (text === "open") { await sock.groupSettingUpdate(from, "not_announcement"); return reply("Group khola hoise ✅") }
      if (text === "close") { await sock.groupSettingUpdate(from, "announcement"); return reply("Group bondho hoise 🔒") }
      return reply("Use: .group open / .group close")
    }

    if (command === "link") {
      if (!isGroup) return reply("Group e use koro!")
      try { let code = await sock.groupInviteCode(from); return reply("Group Link:\nhttps://chat.whatsapp.com/" + code) } catch(e) { return reply("Link ante parlam na, ami admin na mone hoy") }
    }

    if (command === "broadcast" || command === "bc") {
      if (!isOwner) return reply("Sudhu owner use korte parbe!")
      if (!text) return reply("Msg dao! .broadcast Hello sobai")
      // Note: Broadcast sob group e jabe na, ekhon sudhu ei chat e demo
      return reply("Broadcast ready! (Panel theke sob group e jabe - pore add korbo)")
    }

  })
}

startBot()
