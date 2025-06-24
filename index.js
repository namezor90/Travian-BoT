// Ping parancsconst { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

// Bot létrehozása
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Bot bejelentkezés event
client.once('ready', () => {
    console.log(`🤖 Bot bejelentkezett mint ${client.user.tag}!`);
    console.log(`📊 ${client.guilds.cache.size} szerveren vagyok jelen`);
    
    // Bot státusz beállítása
    client.user.setActivity('!help parancsot', { type: 'WATCHING' });
});

// Új tag csatlakozás
client.on('guildMemberAdd', member => {
    const welcomeEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🎉 Üdvözöllek!')
        .setDescription(`Szia ${member.user.username}! Üdvözöllek a **${member.guild.name}** szerveren!`)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

    // Üdvözlő üzenet küldése (alapértelmezett csatornába)
    const defaultChannel = member.guild.systemChannel;
    if (defaultChannel) {
        defaultChannel.send({ embeds: [welcomeEmbed] });
    }
});

// Travian segédfüggvények
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function calculateTravelTime(distance, speed) {
    // Travian utazási idő: távolság / sebesség (mező/óra)
    return Math.ceil((distance * 3600) / speed); // másodpercben
}

function calculateResources(wood, clay, iron, crop, time) {
    // Erőforrás termelés számítása idővel
    return {
        wood: Math.floor(wood * (time / 3600)),
        clay: Math.floor(clay * (time / 3600)), 
        iron: Math.floor(iron * (time / 3600)),
        crop: Math.floor(crop * (time / 3600))
    };
}

// Üzenetek kezelése
client.on('messageCreate', message => {
    // Bot saját üzeneteit figyelmen kívül hagyja
    if (message.author.bot) return;

    const prefix = '!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Help parancs
    if (command === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setColor('#DAA520')
            .setTitle('🏛️ Travian Bot - Parancsok')
            .setDescription('**Travian segédeszközök és általános parancsok:**')
            .addFields(
                { name: '🏛️ **TRAVIAN PARANCSOK**', value: '\u200B', inline: false },
                { name: '!utazás [távolság] [sebesség]', value: 'Utazási idő számítása', inline: true },
                { name: '!erőforrás [fa] [agyag] [vas] [búza] [óra]', value: 'Termelés számítása', inline: true },
                { name: '!koordináta [x1] [y1] [x2] [y2]', value: 'Távolság számítása', inline: true },
                { name: '!emlékeztető [perc] [üzenet]', value: 'Időzítő beállítása', inline: true },
                { name: '!sebesség', value: 'Egység sebességek listája', inline: true },
                { name: '!tribe [törzs]', value: 'Törzs információk', inline: true },
                { name: '🤖 **ÁLTALÁNOS PARANCSOK**', value: '\u200B', inline: false },
                { name: '!ping', value: 'Bot válaszidő', inline: true },
                { name: '!info', value: 'Szerver információk', inline: true },
                { name: '!tisztít [szám]', value: 'Üzenetek törlése', inline: true }
            )
            .setFooter({ text: 'Travian Bot v1.0', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [helpEmbed] });
    }

    // Travian utazási idő számítás
    else if (command === 'utazás' || command === 'travel') {
        const distance = parseFloat(args[0]);
        const speed = parseFloat(args[1]);

        if (isNaN(distance) || isNaN(speed) || distance <= 0 || speed <= 0) {
            return message.reply('❌ Használat: `!utazás [távolság] [sebesség]`\nPélda: `!utazás 15.3 19` (15.3 mező, 19 mező/óra)');
        }

        const travelTimeSeconds = calculateTravelTime(distance, speed);
        const arrivalTime = new Date(Date.now() + travelTimeSeconds * 1000);

        const travelEmbed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('⏱️ Utazási Idő Számítás')
            .addFields(
                { name: '📏 Távolság', value: `${distance} mező`, inline: true },
                { name: '🏃 Sebesség', value: `${speed} mező/óra`, inline: true },
                { name: '⏰ Utazási idő', value: formatTime(travelTimeSeconds), inline: true },
                { name: '📅 Érkezés', value: `<t:${Math.floor(arrivalTime.getTime() / 1000)}:F>`, inline: false }
            )
            .setTimestamp();

        message.reply({ embeds: [travelEmbed] });
    }

    // Koordináta távolság számítás
    else if (command === 'koordináta' || command === 'coords') {
        const x1 = parseInt(args[0]);
        const y1 = parseInt(args[1]);
        const x2 = parseInt(args[2]);
        const y2 = parseInt(args[3]);

        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
            return message.reply('❌ Használat: `!koordináta [x1] [y1] [x2] [y2]`\nPélda: `!koordináta 0 0 15 20`');
        }

        const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

        const coordEmbed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('📍 Koordináta Távolság')
            .addFields(
                { name: '📌 Kiindulópont', value: `(${x1}|${y1})`, inline: true },
                { name: '🎯 Célpont', value: `(${x2}|${y2})`, inline: true },
                { name: '📏 Távolság', value: `${distance.toFixed(2)} mező`, inline: true }
            )
            .setTimestamp();

        message.reply({ embeds: [coordEmbed] });
    }

    // Erőforrás termelés számítás
    else if (command === 'erőforrás' || command === 'resource') {
        const wood = parseInt(args[0]);
        const clay = parseInt(args[1]);
        const iron = parseInt(args[2]);
        const crop = parseInt(args[3]);
        const hours = parseFloat(args[4]);

        if (isNaN(wood) || isNaN(clay) || isNaN(iron) || isNaN(crop) || isNaN(hours)) {
            return message.reply('❌ Használat: `!erőforrás [fa/óra] [agyag/óra] [vas/óra] [búza/óra] [órák száma]`\nPélda: `!erőforrás 120 100 80 50 8.5`');
        }

        const production = calculateResources(wood, clay, iron, crop, hours);

        const resourceEmbed = new EmbedBuilder()
            .setColor('#228B22')
            .setTitle('🌾 Erőforrás Termelés')
            .addFields(
                { name: '⏰ Időtartam', value: `${hours} óra`, inline: false },
                { name: '🪵 Fa', value: `${production.wood.toLocaleString()}`, inline: true },
                { name: '🏺 Agyag', value: `${production.clay.toLocaleString()}`, inline: true },
                { name: '⚙️ Vas', value: `${production.iron.toLocaleString()}`, inline: true },
                { name: '🌾 Búza', value: `${production.crop.toLocaleString()}`, inline: true },
                { name: '📊 Óránkénti termelés', value: `🪵${wood} 🏺${clay} ⚙️${iron} 🌾${crop}`, inline: false }
            )
            .setTimestamp();

        message.reply({ embeds: [resourceEmbed] });
    }

    // Egység sebességek
    else if (command === 'sebesség' || command === 'speed') {
        const speedEmbed = new EmbedBuilder()
            .setColor('#FF6347')
            .setTitle('🏃 Egység Sebességek (mező/óra)')
            .addFields(
                { name: '🛡️ **RÓMAI**', value: '**Légió:** 16\n**Praetoriánus:** 18\n**Impériáns:** 15\n**Equites Legati:** 16\n**Equites Imperatoris:** 14\n**Equites Caesaris:** 19', inline: true },
                { name: '⚔️ **GERMÁN**', value: '**Buzogányos:** 7\n**Lándzsás:** 6\n**Fejszés:** 6\n**Felderítő:** 18\n**Pallos:** 19\n**Theutates Thunder:** 19', inline: true },
                { name: '🏹 **GALL**', value: '**Fallabda:** 5\n**Kardos:** 6\n**Útmutató:** 17\n**Theutates Thunder:** 19\n**Druidride:** 16\n**Haeduan:** 13', inline: true },
                { name: '🚛 **KERESKEDŐ**', value: '**Római:** 16 mező/óra\n**Germán:** 12 mező/óra\n**Gall:** 24 mező/óra', inline: false },
                { name: '🏰 **OSTROM**', value: '**Kos:** 3 mező/óra\n**Katapult:** 3 mező/óra', inline: true }
            )
            .setFooter({ text: 'Normál szerver sebességek' })
            .setTimestamp();

        message.reply({ embeds: [speedEmbed] });
    }

    // Törzs információk
    else if (command === 'tribe' || command === 'törzs') {
        const tribe = args[0]?.toLowerCase();
        
        let tribeEmbed;
        if (tribe === 'római' || tribe === 'roman') {
            tribeEmbed = new EmbedBuilder()
                .setColor('#DC143C')
                .setTitle('🛡️ Római Birodalom')
                .addFields(
                    { name: '💪 Erősségek', value: '• Erős védelem\n• Jó építkezési bónuszok\n• Kiegyensúlyozott egységek', inline: true },
                    { name: '⚖️ Gyengeségek', value: '• Drága egységek\n• Lassabb fejlődés kezdetben', inline: true },
                    { name: '🏆 Különlegességek', value: '• Kettős építkezés 10-es szinttől\n• Erős védőegységek\n• Stabil gazdaság', inline: false }
                );
        } else if (tribe === 'germán' || tribe === 'teuton') {
            tribeEmbed = new EmbedBuilder()
                .setColor('#228B22')
                .setTitle('⚔️ Germán Törzsek')
                .addFields(
                    { name: '💪 Erősségek', value: '• Olcsó egységek\n• Jó raiding képesség\n• Erős támadó egységek', inline: true },
                    { name: '⚖️ Gyengeségek', value: '• Gyenge védelem\n• Lassú kereskedő\n• Kevesebb búza', inline: true },
                    { name: '🏆 Különlegességek', value: '• Raktár és magtár védelem\n• Foglya ejthető\n• Falak válaszcsapás', inline: false }
                );
        } else if (tribe === 'gall' || tribe === 'gaul') {
            tribeEmbed = new EmbedBuilder()
                .setColor('#4169E1')
                .setTitle('🏹 Gall Törzsek')
                .addFields(
                    { name: '💪 Erősségek', value: '• Gyors kereskedő\n• Kiváló védőfal\n• Jó felderítés', inline: true },
                    { name: '⚖️ Gyengeségek', value: '• Drága egységek\n• Lassabb támadó egységek', inline: true },
                    { name: '🏆 Különlegességek', value: '• Csapdák építhetők\n• Legjobb kereskedő\n• Erős védőegységek', inline: false }
                );
        } else {
            return message.reply('❌ Használat: `!törzs [római/germán/gall]`\nPélda: `!törzs római`');
        }

        message.reply({ embeds: [tribeEmbed] });
    }

    // Emlékeztető (egyszerű időzítő)
    else if (command === 'emlékeztető' || command === 'remind') {
        const minutes = parseInt(args[0]);
        const reminderText = args.slice(1).join(' ');

        if (isNaN(minutes) || minutes <= 0 || !reminderText) {
            return message.reply('❌ Használat: `!emlékeztető [perc] [üzenet]`\nPélda: `!emlékeztető 30 Ellenőrizd a farmokat!`');
        }

        if (minutes > 1440) { // Max 24 óra
            return message.reply('❌ Maximum 1440 perc (24 óra) állítható be!');
        }

        const reminderEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⏰ Emlékeztető Beállítva')
            .addFields(
                { name: '⏱️ Idő', value: `${minutes} perc`, inline: true },
                { name: '📝 Üzenet', value: reminderText, inline: true },
                { name: '🔔 Értesítés', value: `<t:${Math.floor((Date.now() + minutes * 60000) / 1000)}:R>`, inline: false }
            )
            .setTimestamp();

        message.reply({ embeds: [reminderEmbed] });

        // Időzítő beállítása
        setTimeout(() => {
            const alertEmbed = new EmbedBuilder()
                .setColor('#FF4500')
                .setTitle('🔔 Emlékeztető!')
                .setDescription(`**${reminderText}**`)
                .addFields(
                    { name: '👤 Beállította', value: `<@${message.author.id}>`, inline: true },
                    { name: '⏰ Beállítva', value: `${minutes} perce`, inline: true }
                )
                .setTimestamp();

            message.channel.send({ content: `<@${message.author.id}>`, embeds: [alertEmbed] });
        }, minutes * 60000);
    }
    else if (command === 'ping') {
        const sent = Date.now();
        message.reply('🏓 Pong!').then(msg => {
            const timeDiff = Date.now() - sent;
            msg.edit(`🏓 Pong! \`${timeDiff}ms\`\nAPI Késleltetés: \`${Math.round(client.ws.ping)}ms\``);
        });
    }

    // Szerver info parancs
    else if (command === 'info') {
        const guild = message.guild;
        const infoEmbed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle(`📊 ${guild.name} szerver információi`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: '👑 Tulajdonos', value: `<@${guild.ownerId}>`, inline: true },
                { name: '👥 Tagok száma', value: `${guild.memberCount}`, inline: true },
                { name: '📅 Létrehozva', value: guild.createdAt.toLocaleDateString('hu-HU'), inline: true },
                { name: '📝 Csatornák', value: `${guild.channels.cache.size}`, inline: true },
                { name: '😀 Emojik', value: `${guild.emojis.cache.size}`, inline: true },
                { name: '🏷️ Szerepek', value: `${guild.roles.cache.size}`, inline: true }
            )
            .setTimestamp();

        message.reply({ embeds: [infoEmbed] });
    }

    // User info parancs
    else if (command === 'user') {
        const user = message.mentions.users.first() || message.author;
        const member = message.guild.members.cache.get(user.id);

        const userEmbed = new EmbedBuilder()
            .setColor('#9932cc')
            .setTitle(`👤 ${user.username} információi`)
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: '🏷️ Felhasználónév', value: user.username, inline: true },
                { name: '🆔 ID', value: user.id, inline: true },
                { name: '📅 Fiók létrehozva', value: user.createdAt.toLocaleDateString('hu-HU'), inline: true },
                { name: '📥 Csatlakozott', value: member.joinedAt.toLocaleDateString('hu-HU'), inline: true },
                { name: '🏷️ Szerepek', value: member.roles.cache.map(role => role.name).join(', ') || 'Nincs szerep', inline: false }
            )
            .setTimestamp();

        message.reply({ embeds: [userEmbed] });
    }

    // Avatar parancs
    else if (command === 'avatar') {
        const user = message.mentions.users.first() || message.author;
        
        const avatarEmbed = new EmbedBuilder()
            .setColor('#ff69b4')
            .setTitle(`🖼️ ${user.username} profilképe`)
            .setImage(user.displayAvatarURL({ size: 512 }))
            .setTimestamp();

        message.reply({ embeds: [avatarEmbed] });
    }

    // Üzenetek törlése parancs
    else if (command === 'tisztít') {
        // Jogosultság ellenőrzés
        if (!message.member.permissions.has('MANAGE_MESSAGES')) {
            return message.reply('❌ Nincs jogosultságod üzenetek törléséhez!');
        }

        const amount = parseInt(args[0]);

        if (isNaN(amount) || amount <= 0 || amount > 100) {
            return message.reply('❌ Kérlek adj meg egy számot 1 és 100 között!');
        }

        message.channel.bulkDelete(amount + 1, true).then(() => {
            message.channel.send(`✅ Töröltem **${amount}** üzenetet!`).then(msg => {
                setTimeout(() => msg.delete(), 3000);
            });
        }).catch(error => {
            console.error(error);
            message.reply('❌ Hiba történt az üzenetek törlésekor!');
        });
    }

    // Ismeretlen parancs
    else {
        message.reply('❌ Ismeretlen parancs! Használd a `!help` parancsot a súgóért.');
    }
});

// Hiba kezelés
client.on('error', error => {
    console.error('Discord.js hiba:', error);
});

// Bot bejelentkezés
client.login(process.env.DISCORD_TOKEN);
