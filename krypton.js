const {
    WAConnection, MessageType
} = require('@adiwajshing/baileys')
const { Collection } = require('discord.js')
const { readdirSync } = require('fs')
const { join } = require('path')
const { start, success, getGroupAdmins, banner } = require('./utils/functions')
const { color } = require('./utils/color')
const fs = require('fs')
const moment = require('moment-timezone')
const { welcome, goodbye } = require('./utils/greeting')
const time = moment.tz('Asia/Jakarta').format('DD/MM HH:mm:ss')
const { databaseView, databaseInput } = require('./utils/db')

async function krypton () {
    /***
     * Initial Database
    **/
    // Black List
    databaseInput('CREATE TABLE IF NOT EXISTS blacklist( id VARCHAR(30) PRIMARY KEY NOT NULL , reason CHAR(225) DEFAULT \'No Reason\')')
        .catch(err => console.log(err))
    // Filters
    databaseInput('CREATE TABLE IF NOT EXISTS filters( gid VARCHAR(50) NOT NULL , key VARCHAR(225) NOT NULL, res VARCHAR(225) NOT NULL )')
        .catch(err => console.log(err))
    // Notes
    databaseInput('CREATE TABLE IF NOT EXISTS notes( gid VARCHAR(50) NOT NULL , key VARCHAR(225) NOT NULL, res VARCHAR(225) NOT NULL )')
        .catch(err => console.log(err))
    // Premium
    databaseInput('CREATE TABLE IF NOT EXISTS gmium( gid VARCHAR(50) PRIMARY KEY NOT NULL, lifetime VARCHAR(10) NOT NULL, signature VARCHAR(30) NOT NULL, waktu TIMESTAMP NOT NULL DEFAULT now() )')
        .catch(err => console.log(err))
    databaseInput('CREATE TABLE IF NOT EXISTS pmium( gid VARCHAR(50) PRIMARY KEY NOT NULL, waktu TIMESTAMP NOT NULL DEFAULT now() )')
        .catch(err => console.log(err))
    // Blacklist text
    databaseInput('CREATE TABLE IF NOT EXISTS bllist( gid VARCHAR(50) NOT NULL , text VARCHAR(225) NOT NULL)')
        .catch(err => console.log(err))
    // Blacklist user
    databaseInput('CREATE TABLE IF NOT EXISTS warn( gid VARCHAR(50) NOT NULL, uid VARCHAR(30) NOT NULL , warn VARCHAR(100) NOT NULL)')
        .catch(err => console.log(err))
    // Sudo
    databaseInput('CREATE TABLE IF NOT EXISTS sudo( id VARCHAR(30) PRIMARY KEY NOT NULL )')
        .catch(err => console.log(err))
    // Sudo
    databaseInput('CREATE TABLE IF NOT EXISTS afks( uid VARCHAR(30) PRIMARY KEY NOT NULL, afk VARCHAR(10) NOT NULL, reason CHAR(225) NOT NULL, timestart VARCHAR(100) NOT NULL )')
        .catch(err => console.log(err))

    const client = new WAConnection()
    client.cmd = new Collection()
    client.runtimeDb = new Collection()
    const cooldowns = new Collection()
    client.logger.level = 'warn'
    console.log(banner.string)
    await client.on('qr', () => {
        console.log(color('[', 'white'), color('!', 'red'), color(']', 'white'), color(' Scan the QR code above'))
    })

    // Connect to sessions if already exist
    if (fs.existsSync('./sessions/krypton-sessions.json')) {
        await client.loadAuthInfo('./sessions/krypton-sessions.json')
        await client.on('connecting', () => {
            start('1', '[SERVER] Menyambungkan ke sessions yang sudah ada...')
        })
    }

    // Server connecting
    if (!fs.existsSync('./sessions/krypton-sessions.json')) {
        await client.on('connecting', () => {
            start('1', '[SERVER] Menunggu scan code QR untuk menyambungkan...')
        })
    }

    // Server connected
    await client.on('open', () => {
        success('1', '[SERVER] Terhubung')
        console.log('🤖', color('KryPtoN Bot Sudah siap!!', 'green'))
    })

    // Create file for sessions
    await client.connect({ timeoutMs: 30 * 1000 })
    fs.writeFileSync('./sessions/krypton-sessions.json', JSON.stringify(client.base64EncodedAuthInfo(), null, '\t'))

    await client.on('group-participants-update', async (greeting) => {
        try {
            const num = greeting.participants[0]
            const mdata = await client.groupMetadata(greeting.jid)
            const name = client.contacts[num] != undefined ? client.contacts[num].vname || client.contacts[num].notify : undefined
            const ppimg = await client.getProfilePicture(`${greeting.participants[0].split('@')[0]}@c.us`)
            if (greeting.action == 'add') {
                console.log('\x1b[1;31m~\x1b[1;37m>', '[\x1b[1;32mEXEC\x1b[1;37m]', time, 'client', color(greeting.participants[0].split('@')[0]), 'Masuk ke group', color(mdata.subject))
                await welcome(name, mdata.subject, ppimg).then(async (hasil) => {
                    await client.sendMessage(mdata.id, hasil, MessageType.image)
                })
            } else if (greeting.action == 'remove') {
                console.log('\x1b[1;31m~\x1b[1;37m>', '[\x1b[1;32mEXEC\x1b[1;37m]', time, 'client', color(greeting.participants[0].split('@')[0]), 'Keluar dari group', color(mdata.subject))
                await goodbye(name, mdata.subject, ppimg).then(async (hasil) => {
                    await client.sendMessage(mdata.id, hasil, MessageType.image)
                })
            }
        } catch (e) {
            console.log('Error : %s', color(e, 'red'))
        }
    })

    await client.on('chat-update', async (chat) => {
        client.pingStart = chat.t
        client.apiKey = process.env.API_KEY
        if (!chat.hasNewMessage) return
        const prefix = '!'
        chat = JSON.parse(JSON.stringify(chat)).messages[0]
        if (!chat.message) return
        if (chat.key.remoteJid == 'status@broadcast') return
        if (chat.key.fromMe) return

        // Variable
        const type = Object.keys(chat.message)[0]
        client.body = (type === 'conversation' && chat.message.conversation.startsWith(prefix)) ? chat.message.conversation : (type == 'imageMessage') && chat.message.imageMessage.caption.startsWith(prefix) ? chat.message.imageMessage.caption : (type == 'videoMessage') && chat.message.videoMessage.caption.startsWith(prefix) ? chat.message.videoMessage.caption : (type == 'extendedTextMessage') && chat.message.extendedTextMessage.text.startsWith(prefix) ? chat.message.extendedTextMessage.text : ''
        const args = client.body.trim().split(/ +/).slice(1)
        const isCmd = client.body.startsWith(prefix)
        const commandName = client.body.slice(1).trim().split(/ +/).shift().toLowerCase()
        const content = JSON.stringify(chat.message)
        const botNumber = client.user.jid
        const ownerNumber = process.env.OWNER_PHONE // Isi di .env
        client.from = chat.key.remoteJid
        client.isGroup = client.from.endsWith('@g.us')
        client.sender = client.isGroup ? chat.participant : chat.key.remoteJid
        const groupMetadata = client.isGroup ? await client.groupMetadata(client.from) : ''
        const groupName = client.isGroup ? groupMetadata.subject : ''
        client.groupMembers = client.isGroup ? groupMetadata.participants : ''
        const groupAdmins = client.isGroup ? getGroupAdmins(client.groupMembers) : ''
        client.groupId = client.isGroup ? groupMetadata.jid : ''
        client.isGroup = client.from.endsWith('@g.us')
        client.isBotGroupAdmins = groupAdmins.includes(botNumber) || false
        client.isGroupAdmins = groupAdmins.includes(client.sender) || false
        client.isOwner = client.sender.includes(ownerNumber)
        client.isUrl = (url) => {
            // eslint-disable-next-line prefer-regex-literals
            return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'))
        }
        client.reply = (teks) => {
            client.sendMessage(client.from, teks, MessageType.text, { quoted: chat })
        }
        client.sendMess = (id, text) => {
            client.sendMessage(id, text, MessageType.text)
        }
        client.mentions = (teks, id, bolean) => {
            (bolean == null || bolean == undefined || bolean == false) ? client.sendMessage(client.from, teks.trim(), MessageType.extendedText, { contextInfo: { mentionedJid: id } }) : client.sendMessage(client.from, teks.trim(), MessageType.extendedText, { quoted: chat, contextInfo: { mentionedJid: id } })
        }

        client.isMedia = (type === 'imageMessage' || type === 'videoMessage')
        client.isQuotedImage = type === 'extendedTextMessage' && content.includes('imageMessage')
        client.isQuotedVideo = type === 'extendedTextMessage' && content.includes('videoMessage')
        client.isQuotedSticker = type === 'extendedTextMessage' && content.includes('stickerMessage')

        // Premuim
        const viewPm = await databaseView('SELECT * FROM pmium')
        const pmWhiteList = JSON.stringify(viewPm)
        client.isPmium = pmWhiteList.includes(client.sender)

        const viewGc = await databaseView('SELECT * FROM gmium')
        const gcWhiteList = JSON.stringify(viewGc)
        client.isGmium = gcWhiteList.includes(client.groupId)

        const sudo = await databaseView('SELECT * FROM sudo')
        const sList = JSON.stringify(sudo)
        client.isSudo = sList.includes(client.sender)

        // Logging Message
        if (!client.isGroup && isCmd) console.log('\x1b[1;31m~\x1b[1;37m>', '[\x1b[1;32mEXEC\x1b[1;37m]', time, color(commandName), 'client.from', color(client.sender.split('@')[0]), 'args :', color(args.length))
        if (!client.isGroup && !isCmd) console.log('\x1b[1;31m~\x1b[1;37m>', '[\x1b[1;31mRECV\x1b[1;37m]', time, color('Message'), 'client.from', color(client.sender.split('@')[0]), 'args :', color(args.length))
        if (isCmd && client.isGroup) console.log('\x1b[1;31m~\x1b[1;37m>', '[\x1b[1;32mEXEC\x1b[1;37m]', time, color(commandName), 'client.from', color(client.sender.split('@')[0]), 'in', color(groupName), 'args :', color(args.length))
        if (!isCmd && client.isGroup) console.log('\x1b[1;31m~\x1b[1;37m>', '[\x1b[1;31mRECV\x1b[1;37m]', time, color('Message'), 'client.from', color(client.sender.split('@')[0]), 'in', color(groupName), 'args :', color(args.length))

        pesan = {
            tunggu: '⌛ Sedang di Prosess ⌛',
            gagal: '❌ Gagal melaksanakan perintah ❌',
            berhasil: '✔️ Berhasil ✔️',
            hanya: {
                admin: '❌ Perintah ini hanya bisa di gunakan oleh admin group! ❌',
                botAdmin: '❌ Perintah ini hanya bisa di gunakan ketika bot menjadi admin! ❌',
                owner: '❌ Perintah hanya untuk owner/sudo! ❌'
            },
            error: {
                group: '❌ Perintah ini hanya bisa di gunakan dalam group! ❌',
                args: '❌ Perintah anda salah! ❌',
                premium: '❌ Perintah hanya untuk pelanggan premium! ❌'
            }
        }

        /**
            * Import all commands
        */
        const commandFiles = readdirSync(join(__dirname, 'command')).filter((file) => file.endsWith('.js'))
        for (const file of commandFiles) {
            const command = require(join(__dirname, 'command', `${file}`))
            client.cmd.set(command.name, command)
        }

        if (!isCmd) return

        const command =
        client.cmd.get(commandName) ||
        client.cmd.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName))

        if (!command) return

        if (!cooldowns.has(command.name)) {
            cooldowns.set(command.name, new Collection())
        }

        // Time durations
        if (!client.isPmium || !client.isGmium || !client.isOwner) {
            const now = Date.now()
            const timestamps = cooldowns.get(command.name)
            const cooldownAmount = (command.cooldown || 1) * 1000

            if (timestamps.has(client.from)) {
                const expirationTime = timestamps.get(client.from) + cooldownAmount

                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000
                    return client.sendMessage(client.from,
                        `[Slow mode] Mohon tunggu lebih dari ${timeLeft.toFixed(1)} detik sebelum menggunakan perintah *${command.name}* kembali.\n\n Berlangganan lah agar tidak selalu menunggu seperti ini, ketik *!pricing* untuk info harga, dll`,
                        MessageType.text
                    )
                }
            }

            timestamps.set(client.from, now)
            setTimeout(() => timestamps.delete(client.from), cooldownAmount)
        }

        try {
            command.execute(client, chat, pesan, args)
        } catch (e) {
            console.log('Error : %s', color(e, 'red'))
            client.sendMessage(client.from, 'Telah terjadi error setelah menggunakan command ini.', MessageType.text)
        }
    })
}

krypton().catch((err) => console.log('Error : %s', color(err, 'red')))
