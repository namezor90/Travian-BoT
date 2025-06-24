// commands/general.js - Általános Discord parancsok
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

async function handleGeneralCommand(message, command, args) {
    switch (command) {
        case 'help':
            await handleHelpCommand(message);
            break;
        case 'parancsok':
        case 'commands':
            await handleCommandsCommand(message);
            break;
        case 'ping':
            await handlePingCommand(message);
            break;
        case 'info':
            await handleInfoCommand(message);
            break;
        case 'user':
            await handleUserCommand(message);
            break;
        case 'avatar':
            await handleAvatarCommand(message);
            break;
        case 'tisztít':
            await handleClearCommand(message, args);
            break;
    }
}

async function handleHelpCommand(message) {
    const helpEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🏛️ Travian Bot - Parancsok')
        .setDescription('**Travian segédeszközök és általános parancsok:**')
        .addFields(
            { name: '🏛️ **TRAVIAN PARANCSOK**', value: '\u200B', inline: false },
            { name: '!utazás [távolság] [sebesség]', value: 'Utazási idő számítása', inline: true },
            { name: '!erőforrás [fa] [agyag] [vas] [búza] [óra]', value: 'Termelés számítása', inline: true },
            { name: '!koordináta [x1] [y1] [x2] [y2]', value: 'Távolság számítása', inline: true },
            { name: '!emlékeztető [perc] [üzenet]', value: 'Időzítő beállítása', inline: true },
            { name: '!sebesség', value: 'Egység sebességek listája', inline: true },
            { name: '!tribe [törzs]', value: 'Törzs információk (5 törzs)', inline: true },
            { name: '🛡️ **ALLIANCE PARANCSOK**', value: '\u200B', inline: false },
            { name: '!seregjelentő', value: 'Alliance sereg jelentő űrlap', inline: true },
            { name: '!védés', value: 'Védési kérés rendszer (ÚJ!)', inline: true },
            { name: '🤖 **ÁLTALÁNOS PARANCSOK**', value: '\u200B', inline: false },
            { name: '!help', value: 'Bot teljes súgó', inline: true },
            { name: '!parancsok', value: 'Gyors parancs referencia', inline: true },
            { name: '!ping', value: 'Bot válaszidő', inline: true },
            { name: '!info', value: 'Szerver információk', inline: true },
            { name: '!tisztít [szám]', value: 'Üzenetek törlése', inline: true }
        )
        .setFooter({ text: `Travian Bot ${config.bot.version} | Alliance Management System`, iconURL: message.client.user.displayAvatarURL() })
        .setTimestamp();

    await message.reply({ embeds: [helpEmbed] });
}

async function handleCommandsCommand(message) {
    const commandsEmbed = new EmbedBuilder()
        .setColor('#9932CC')
        .setTitle('📋 Gyors Parancs Referencia')
        .setDescription('**Travian Bot - Legfontosabb parancsok:**')
        .addFields(
            { name: '⚡ **GYORS SZÁMÍTÁSOK**', value: '`!utazás 15.3 19` - Utazási idő\n`!koordináta 0 0 15 20` - Távolság\n`!erőforrás 120 100 80 50 8.5` - Termelés', inline: false },
            { name: '📚 **INFORMÁCIÓK**', value: '`!sebesség` - Egység sebességek\n`!törzs római` - Törzs részletek\n`!help` - Teljes súgó', inline: false },
            { name: '⚔️ **ALLIANCE FUNKCIÓK**', value: '`!seregjelentő` - Interaktív sereg jelentő\n`!védés` - 🛡️ **ÚJ!** Védési kérés rendszer', inline: false },
            { name: '⏰ **IDŐZÍTŐ**', value: '`!emlékeztető 30 Farmok!` - Emlékeztető\n`!ping` - Bot státusz', inline: false },
            { name: '🎯 **ELÉRHETŐ TÖRZSEK**', value: 'római • germán • gall • egyiptomi • hun', inline: false }
        )
        .setFooter({ text: 'Részletes leírás: !help parancs' })
        .setTimestamp();

    await message.reply({ embeds: [commandsEmbed] });
}

async function handlePingCommand(message) {
    const sent = Date.now();
    const reply = await message.reply('🏓 Pong!');
    
    const timeDiff = Date.now() - sent;
    const apiLatency = Math.round(message.client.ws.ping);
    
    const pingEmbed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('🏓 Pong!')
        .addFields(
            { name: '📤 Üzenet késleltetés', value: `\`${timeDiff}ms\``, inline: true },
            { name: '🌐 API késleltetés', value: `\`${apiLatency}ms\``, inline: true },
            { name: '📊 Státusz', value: apiLatency < 100 ? '🟢 Kiváló' : apiLatency < 200 ? '🟡 Jó' : '🔴 Lassú', inline: true }
        )
        .setTimestamp();

    await reply.edit({ content: '', embeds: [pingEmbed] });
}

async function handleInfoCommand(message) {
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
            { name: '🏷️ Szerepek', value: `${guild.roles.cache.size}`, inline: true },
            { name: '🤖 Bot verzió', value: `Travian Bot ${config.bot.version}`, inline: true },
            { name: '🛡️ Aktív rendszerek', value: '• Seregjelentő\n• Védési kérések\n• Travian számítások', inline: true },
            { name: '📈 Üzemidő', value: `<t:${Math.floor((Date.now() - message.client.readyTimestamp) / 1000)}:R> óta fut`, inline: true }
        )
        .setTimestamp();

    await message.reply({ embeds: [infoEmbed] });
}

async function handleUserCommand(message) {
    const user = message.mentions.users.first() || message.author;
    const member = message.guild.members.cache.get(user.id);

    if (!member) {
        return message.reply('❌ Felhasználó nem található ezen a szerveren!');
    }

    const userEmbed = new EmbedBuilder()
        .setColor('#9932cc')
        .setTitle(`👤 ${user.username} információi`)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
            { name: '🏷️ Felhasználónév', value: user.username, inline: true },
            { name: '🆔 ID', value: user.id, inline: true },
            { name: '📅 Fiók létrehozva', value: user.createdAt.toLocaleDateString('hu-HU'), inline: true },
            { name: '📥 Csatlakozott', value: member.joinedAt.toLocaleDateString('hu-HU'), inline: true },
            { name: '🏷️ Szerepek', value: member.roles.cache.map(role => role.name).join(', ') || 'Nincs szerep', inline: false },
            { name: '📊 Szerver rangsor', value: `${Array.from(message.guild.members.cache.sort((a, b) => a.joinedAt - b.joinedAt).keys()).indexOf(member.id) + 1}. tag`, inline: true }
        )
        .setTimestamp();

    await message.reply({ embeds: [userEmbed] });
}

async function handleAvatarCommand(message) {
    const user = message.mentions.users.first() || message.author;
    
    const avatarEmbed = new EmbedBuilder()
        .setColor('#ff69b4')
        .setTitle(`🖼️ ${user.username} profilképe`)
        .setDescription(`[Eredeti méret](${user.displayAvatarURL({ size: 4096 })})`)
        .setImage(user.displayAvatarURL({ size: 512 }))
        .setTimestamp();

    await message.reply({ embeds: [avatarEmbed] });
}

async function handleClearCommand(message, args) {
    // Jogosultság ellenőrzés
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return message.reply('❌ Nincs jogosultságod üzenetek törléséhez!');
    }

    const amount = parseInt(args[0]);

    if (isNaN(amount) || amount <= 0 || amount > 100) {
        return message.reply('❌ Kérlek adj meg egy számot 1 és 100 között!');
    }

    try {
        const deleted = await message.channel.bulkDelete(amount + 1, true);
        
        const successEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('🧹 Üzenetek törölve')
            .setDescription(`✅ Töröltem **${deleted.size - 1}** üzenetet!`)
            .setFooter({ text: 'Ez az üzenet 5 másodperc múlva törlődik' })
            .setTimestamp();

        const confirmMessage = await message.channel.send({ embeds: [successEmbed] });
        
        setTimeout(() => {
            confirmMessage.delete().catch(() => {});
        }, 5000);
        
    } catch (error) {
        console.error('Hiba az üzenetek törlésekor:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Hiba történt!')
            .setDescription('Nem sikerült törölni az üzeneteket. Lehetséges okok:\n• Túl régi üzenetek (14 napnál régebbiek)\n• Nincs jogosultságom\n• Szerver hiba')
            .setTimestamp();

        await message.reply({ embeds: [errorEmbed] });
    }
}

module.exports = {
    handleGeneralCommand
};
