const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// Bot létrehozása
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Gomb interakciók kezelése
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    // Seregjelentő modal megnyitása
    if (interaction.isButton() && interaction.customId === 'army_report_modal') {
        const modal = new ModalBuilder()
            .setCustomId('army_report_form')
            .setTitle('⚔️ Alliance Seregjelentő');

        // Alapadatok
        const playerName = new TextInputBuilder()
            .setCustomId('player_name')
            .setLabel('👤 Játékos neve')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('pl. Namezor90')
            .setRequired(true);

        const villageName = new TextInputBuilder()
            .setCustomId('village_name')
            .setLabel('🏘️ Falu neve és koordinátái')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('pl. Erőd (15|25)')
            .setRequired(true);

        const tribeName = new TextInputBuilder()
            .setCustomId('tribe_name')
            .setLabel('🏛️ Törzs típusa')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('római/germán/gall/egyiptomi/hun')
            .setRequired(true);

        // Egységek
        const infantry = new TextInputBuilder()
            .setCustomId('infantry')
            .setLabel('🛡️ Gyalogos egységek (védelem)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('pl. Légió: 150, Testőrség: 80')
            .setRequired(false);

        const cavalry = new TextInputBuilder()
            .setCustomId('cavalry')
            .setLabel('🐎 Lovas egységek (támadás/védelem)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('pl. Equites Legati: 50, Equites Caesaris: 30')
            .setRequired(false);

        // Sorok hozzáadása
        const firstRow = new ActionRowBuilder().addComponents(playerName);
        const secondRow = new ActionRowBuilder().addComponents(villageName);
        const thirdRow = new ActionRowBuilder().addComponents(tribeName);
        const fourthRow = new ActionRowBuilder().addComponents(infantry);
        const fifthRow = new ActionRowBuilder().addComponents(cavalry);

        modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

        await interaction.showModal(modal);
    }

    // Seregjelentő form feldolgozása
    if (interaction.isModalSubmit() && interaction.customId === 'army_report_form') {
        await interaction.deferReply({ ephemeral: true });

        const playerName = interaction.fields.getTextInputValue('player_name');
        const villageName = interaction.fields.getTextInputValue('village_name');
        const tribeName = interaction.fields.getTextInputValue('tribe_name');
        const infantry = interaction.fields.getTextInputValue('infantry') || 'Nincs megadva';
        const cavalry = interaction.fields.getTextInputValue('cavalry') || 'Nincs megadva';

        // Törzs szín meghatározása
        let tribeColor = '#DAA520';
        const tribe = tribeName.toLowerCase();
        if (tribe.includes('római')) tribeColor = '#DC143C';
        else if (tribe.includes('germán')) tribeColor = '#228B22';
        else if (tribe.includes('gall')) tribeColor = '#4169E1';
        else if (tribe.includes('egyiptomi')) tribeColor = '#FFD700';
        else if (tribe.includes('hun')) tribeColor = '#8B4513';

        // Vezetői jelentés embed
        const leaderReportEmbed = new EmbedBuilder()
            .setColor(tribeColor)
            .setTitle('📊 Új Seregjelentés Érkezett!')
            .addFields(
                { name: '👤 Játékos', value: `**${playerName}**`, inline: true },
                { name: '🏘️ Falu', value: `**${villageName}**`, inline: true },
                { name: '🏛️ Törzs', value: `**${tribeName}**`, inline: true },
                { name: '🛡️ Gyalogos egységek', value: `${infantry}`, inline: false },
                { name: '🐎 Lovas egységek', value: `${cavalry}`, inline: false },
                { name: '📅 Jelentés időpontja', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                { name: '👨‍💼 Jelentette', value: `<@${interaction.user.id}>`, inline: true }
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp();

        // Vezetők csatornájába küldés
        try {
            const leaderChannel = interaction.guild.channels.cache.get(ARMY_REPORT_CHANNEL_ID);
            if (leaderChannel) {
                await leaderChannel.send({ 
                    content: '🚨 **Új seregjelentés érkezett!**', 
                    embeds: [leaderReportEmbed] 
                });
            }

            // Megerősítő üzenet a felhasználónak
            const confirmEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Seregjelentés Sikeresen Elküldve!')
                .setDescription('A jelentésed eljutott a vezetőséghez.')
                .addFields(
                    { name: '📊 Adatok', value: `**Játékos:** ${playerName}\n**Falu:** ${villageName}\n**Törzs:** ${tribeName}`, inline: false },
                    { name: '📅 Időpont', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setFooter({ text: 'Alliance Management System' })
                .setTimestamp();

            await interaction.editReply({ embeds: [confirmEmbed] });

        } catch (error) {
            console.error('Hiba a seregjelentés küldésénél:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Hiba történt!')
                .setDescription('Nem sikerült elküldeni a jelentést. Ellenőrizd a csatorna beállításokat.')
                .setFooter({ text: 'Kérj segítséget egy adminisztrátortól' })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
});

// Seregjelentő beállítások - IDE ÁLLÍTSD BE A CSATORNA ID-T!
const ARMY_REPORT_CHANNEL_ID = '1387002073945473084'; // Vezetők csatorna ID
const army_reports = new Map(); // Ideiglenes tárolás

// Bot bejelentkezés event
client.once('ready', () => {
    console.log(`🤖 Bot bejelentkezett mint ${client.user.tag}!`);
    console.log(`📊 ${client.guilds.cache.size} szerveren vagyok jelen`);
    
    // Bot státusz beállítása
    client.user.setActivity('!help parancsot | Travian segítő', { type: ActivityType.Watching });
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
                { name: '!tribe [törzs]', value: 'Törzs információk (római/germán/gall/egyiptomi/hun)', inline: true },
                { name: '🤖 **ÁLTALÁNOS PARANCSOK**', value: '\u200B', inline: false },
                { name: '!help', value: 'Bot teljes súgó', inline: true },
                { name: '!parancsok', value: 'Gyors parancs referencia', inline: true },
                { name: '!ping', value: 'Bot válaszidő', inline: true },
                { name: '!info', value: 'Szerver információk', inline: true },
                { name: '!seregjelentő', value: 'Alliance sereg jelentő űrlap', inline: true },
                { name: '!tisztít [szám]', value: 'Üzenetek törlése', inline: true }
            )
            .setFooter({ text: 'Travian Bot v1.0', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [helpEmbed] });
    }

    // Parancsok listája (rövid)
    else if (command === 'parancsok' || command === 'commands') {
        const commandsEmbed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle('📋 Gyors Parancs Referencia')
            .setDescription('**Travian Bot - Legfontosabb parancsok:**')
            .addFields(
                { name: '⚡ **GYORS SZÁMÍTÁSOK**', value: '`!utazás 15.3 19` - Utazási idő\n`!koordináta 0 0 15 20` - Távolság\n`!erőforrás 120 100 80 50 8.5` - Termelés', inline: false },
                { name: '📚 **INFORMÁCIÓK**', value: '`!sebesség` - Egység sebességek\n`!törzs római` - Törzs részletek\n`!help` - Teljes súgó', inline: false },
                { name: '⚔️ **ALLIANCE FUNKCIÓK**', value: '`!seregjelentő` - Sereg jelentő űrlap', inline: false },
                { name: '⏰ **IDŐZÍTŐ**', value: '`!emlékeztető 30 Farmok!` - Emlékeztető\n`!ping` - Bot státusz', inline: false },
                { name: '🎯 **ELÉRHETŐ TÖRZSEK**', value: 'római • germán • gall • egyiptomi • hun', inline: false }
            )
            .setFooter({ text: 'Részletes leírás: !help parancs' })
            .setTimestamp();

        message.reply({ embeds: [commandsEmbed] });
    }

    // Seregjelentő parancs
    else if (command === 'seregjelentő' || command === 'army') {
        const reportButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('army_report_modal')
                    .setLabel('📊 Seregjelentő Kitöltése')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚔️')
            );

        const reportEmbed = new EmbedBuilder()
            .setColor('#FF6B35')
            .setTitle('⚔️ Alliance Seregjelentő')
            .setDescription('**Kattints a gombra a seregjelentő kitöltéséhez!**\n\n📋 **Mit kell megadni:**\n• 👤 Játékos neve\n• 🏘️ Falu neve és koordinátái\n• 🏛️ Törzs típusa\n• ⚔️ Egységek száma')
            .addFields(
                { name: '🎯 Miért fontos?', value: 'A vezetőség ezzel tudja koordinálni a támadásokat és védelmet!', inline: false },
                { name: '📊 Hova kerül?', value: 'A vezetők csatornájába automatikusan összegződik.', inline: false }
            )
            .setFooter({ text: 'Alliance Management System' })
            .setTimestamp();

        message.reply({ embeds: [reportEmbed], components: [reportButton] });
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
                { name: '🛡️ **RÓMAI**', value: '**Légió:** 16\n**Testőrség:** 18\n**Birodalmi:** 15\n**Equites Legati:** 16\n**Equites Imperatoris:** 14\n**Equites Caesaris:** 19\n**Faltörő-kos:** 3\n**Tűzkatapult:** 3', inline: true },
                { name: '⚔️ **GERMÁN**', value: '**Buzogányos:** 7\n**Lándzsás:** 6\n**Csatabárdos:** 6\n**Felderítő:** 18\n**Paladin:** 19\n**Teuton lovag:** 19\n**Faltörő kos:** 3\n**Katapult:** 3', inline: true },
                { name: '🏹 **GALL**', value: '**Phalanx:** 5\n**Kardos:** 6\n**Felderítő:** 17\n**Theutat Villám:** 19\n**Druida lovas:** 16\n**Haeduan:** 13\n**Falromboló:** 3\n**Harci-katapult:** 3', inline: true },
                { name: '🏺 **EGYIPTOMI**', value: '**Rabszolgamilícia:** 7\n**Kőris őr:** 6\n**Khopesh harcos:** 6\n**Sopdu felfedező:** 16\n**Anhur őr:** 14\n**Resheph fogathajtó:** 18\n**Faltörő kos:** 3\n**Kőkatapult:** 3', inline: true },
                { name: '🏹 **HUN**', value: '**Zsoldos:** 7\n**Íjász:** 6\n**Figyelő:** 14\n**Sztyeppei lovas:** 18\n**Mesterlövész:** 19\n**Martalóc:** 16\n**Faltörő kos:** 3\n**Katapult:** 3', inline: true },
                { name: '🚛 **KERESKEDŐ**', value: '**Római:** 16 mező/óra\n**Germán:** 12 mező/óra\n**Gall:** 24 mező/óra\n**Egyiptomi:** 12 mező/óra\n**Hun:** 20 mező/óra', inline: false }
            )
            .setFooter({ text: 'Normál szerver sebességek - Minden törzs adatai' })
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
                    { name: '💪 Erősségek', value: '• Erős védelem\n• Jó építkezési bónuszok\n• Kiegyensúlyozott egységek\n• Kettős építkezés', inline: true },
                    { name: '⚖️ Gyengeségek', value: '• Drága egységek\n• Lassabb fejlődés kezdetben\n• Közepes kereskedő sebesség', inline: true },
                    { name: '🏆 Különlegességek', value: '• Kettős építkezés 10-es szinttől\n• Erős védőegységek\n• Stabil gazdaság\n• Szenátor (befolyás)', inline: false },
                    { name: '⚔️ Fő egységek', value: '**Védelem:** Légió, Testőrség\n**Támadás:** Birodalmi, Equites Caesaris\n**Felderítés:** Equites Legati', inline: false }
                );
        } else if (tribe === 'germán' || tribe === 'teuton') {
            tribeEmbed = new EmbedBuilder()
                .setColor('#228B22')
                .setTitle('⚔️ Germán Törzsek')
                .addFields(
                    { name: '💪 Erősségek', value: '• Olcsó egységek\n• Jó raiding képesség\n• Erős támadó egységek\n• Foglya ejtés', inline: true },
                    { name: '⚖️ Gyengeségek', value: '• Gyenge védelem\n• Lassú kereskedő\n• Kevesebb búza\n• Drága infrastruktúra', inline: true },
                    { name: '🏆 Különlegességek', value: '• Raktár és magtár védelem\n• Foglya ejthető\n• Falak válaszcsapás\n• Törzsi vezető (megsemmisítés)', inline: false },
                    { name: '⚔️ Fő egységek', value: '**Védelem:** Lándzsás, Paladin\n**Támadás:** Buzogányos, Csatabárdos\n**Felderítés:** Felderítő', inline: false }
                );
        } else if (tribe === 'gall' || tribe === 'gaul') {
            tribeEmbed = new EmbedBuilder()
                .setColor('#4169E1')
                .setTitle('🏹 Gall Törzsek')
                .addFields(
                    { name: '💪 Erősségek', value: '• Gyors kereskedő\n• Kiváló védőfal\n• Jó felderítés\n• Csapdák', inline: true },
                    { name: '⚖️ Gyengeségek', value: '• Drága egységek\n• Lassabb támadó egységek\n• Kisebb támadóerő', inline: true },
                    { name: '🏆 Különlegességek', value: '• Csapdák építhetők\n• Legjobb kereskedő (24 mező/óra)\n• Erős védőegységek\n• Főnök (befolyás)', inline: false },
                    { name: '⚔️ Fő egységek', value: '**Védelem:** Phalanx, Druida lovas\n**Támadás:** Kardos, Theutat Villám\n**Felderítés:** Felderítő', inline: false }
                );
        } else if (tribe === 'egyiptomi' || tribe === 'egyptian') {
            tribeEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🏺 Egyiptomi Birodalom')
                .addFields(
                    { name: '💪 Erősségek', value: '• Gyors fejlődés\n• Olcsó egységek\n• Jó termelési bónuszok\n• Egyedi taktikai lehetőségek', inline: true },
                    { name: '⚖️ Gyengeségek', value: '• Gyengébb védelem\n• Közepes támadóerő\n• Lassú kereskedő', inline: true },
                    { name: '🏆 Különlegességek', value: '• Nagy lakóhely kapacitás\n• Gyors építkezés\n• Nomarch (befolyás)\n• Egyedi építmények', inline: false },
                    { name: '⚔️ Fő egységek', value: '**Védelem:** Kőris őr, Anhur őr\n**Támadás:** Khopesh harcos, Resheph fogathajtó\n**Felderítés:** Sopdu felfedező', inline: false }
                );
        } else if (tribe === 'hun' || tribe === 'huns') {
            tribeEmbed = new EmbedBuilder()
                .setColor('#8B4513')
                .setTitle('🏹 Hun Birodalom')
                .addFields(
                    { name: '💪 Erősségek', value: '• Gyors lovassági egységek\n• Jó raid képesség\n• Erős távolsági támadás\n• Gyors kereskedő', inline: true },
                    { name: '⚖️ Gyengeségek', value: '• Gyenge védelem\n• Drága infrastruktúra\n• Kisebb termelési bónuszok', inline: true },
                    { name: '🏆 Különlegességek', value: '• Nomád életmód előnyök\n• Erős lovasság\n• Kiválasztott (megsemmisítés)\n• Gyors kereskedő (20 mező/óra)', inline: false },
                    { name: '⚔️ Fő egységek', value: '**Védelem:** Íjász, Martalóc\n**Támadás:** Zsoldos, Sztyeppei lovas\n**Felderítés:** Figyelő', inline: false }
                );
        } else {
            return message.reply('❌ Használat: `!törzs [római/germán/gall/egyiptomi/hun]`\nPélda: `!törzs római`');
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
        if (!message.member.permissions.has('ManageMessages')) {
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
