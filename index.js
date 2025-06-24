const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

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
            .setColor('#0099ff')
            .setTitle('📋 Elérhető parancsok')
            .setDescription('Itt vannak az összes parancsaim:')
            .addFields(
                { name: '!help', value: 'Megjeleníti ezt a súgót', inline: true },
                { name: '!ping', value: 'Válaszidő ellenőrzése', inline: true },
                { name: '!info', value: 'Szerver információk', inline: true },
                { name: '!user @felhasználó', value: 'Felhasználó információi', inline: true },
                { name: '!avatar @felhasználó', value: 'Felhasználó profilképe', inline: true },
                { name: '!tisztít [szám]', value: 'Üzenetek törlése (1-100)', inline: true }
            )
            .setFooter({ text: 'Tesztelési bot', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [helpEmbed] });
    }

    // Ping parancs
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
