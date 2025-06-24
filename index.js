// index.js - Frissített fő bot fájl (Slash Commands + UX fejlesztésekkel)
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, Collection, REST, Routes } = require('discord.js');
const config = require('./config');

// Parancs modulok importálása
const travianCommands = require('./commands/travian');
const armyReportCommands = require('./commands/army-report');
const defenseCommands = require('./commands/defense-request');
const generalCommands = require('./commands/general');
const quickArmyReport = require('./commands/quick-army-report');
const { commands } = require('./slash-commands');
const { profileManager } = require('./utils/user-profiles');

// Bot létrehozása
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Parancsok gyűjteménye
client.commands = new Collection();

// Slash parancsok regisztrálása
async function registerSlashCommands() {
    const rest = new REST({ version: '10' }).setToken(config.discord.token);

    try {
        console.log('🔄 Slash parancsok regisztrálása kezdődött...');

        await rest.put(
            Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
            { body: commands.map(command => command.toJSON()) },
        );

        console.log('✅ Slash parancsok sikeresen regisztrálva!');
    } catch (error) {
        console.error('❌ Hiba a slash parancsok regisztrálásában:', error);
    }
}

// Bot bejelentkezés event
client.once('ready', async () => {
    console.log(`🤖 Bot bejelentkezett mint ${client.user.tag}!`);
    console.log(`📊 ${client.guilds.cache.size} szerveren vagyok jelen`);
    console.log(`🛡️ Védési rendszer aktív!`);
    console.log(`⚡ Gyors parancsok aktívak!`);
    
    // Slash parancsok regisztrálása
    await registerSlashCommands();
    
    // Bot státusz beállítása
    client.user.setActivity('⚡ /sereg | Gyors Travian segítő!', { type: ActivityType.Watching });
});

// Új tag csatlakozás - fejlesztett üdvözlő
client.on('guildMemberAdd', async member => {
    const welcomeEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🎉 Üdvözöllek a Travian Alliance-ban!')
        .setDescription(`Szia ${member.user.username}! Üdvözöllek a **${member.guild.name}** szerveren!`)
        .addFields(
            { name: '⚡ Gyors kezdés', value: 'Használd a `/profil beállít` parancsot a személyre szabott funkcióokért!', inline: false },
            { name: '📚 Hasznos parancsok', value: '• `/sereg` - Gyors seregjelentő\n• `/védés` - Védési kérés\n• `/törzs` - Törzs információk\n• `/sebesség` - Egység sebességek', inline: false },
            { name: '💡 Tipp', value: 'A slash parancsok (`/`) automatikus kiegészítést biztosítanak!', inline: false }
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setFooter({ text: 'Travian Bot v3.0 - Slash Commands Ready!' })
        .setTimestamp();

    const defaultChannel = member.guild.systemChannel;
    if (defaultChannel) {
        defaultChannel.send({ embeds: [welcomeEmbed] });
    }
});

// SLASH COMMANDS kezelése
client.on('interactionCreate', async interaction => {
    try {
        // Slash parancsok kezelése
        if (interaction.isChatInputCommand()) {
            const { commandName } = interaction;

            switch (commandName) {
                // GYORS SEREGJELENTŐ (ÚJ!)
                case 'sereg':
                    await quickArmyReport.handleQuickArmyReport(interaction);
                    break;

                // GYORS VÉDÉS (ÚJ!)
                case 'védés':
                    await handleQuickDefense(interaction);
                    break;

                // TRAVIAN SZÁMÍTÁSOK
                case 'utazás':
                    await handleSlashTravel(interaction);
                    break;
                case 'koordináta':
                    await handleSlashCoords(interaction);
                    break;

                // INFORMÁCIÓK
                case 'törzs':
                    await handleSlashTribe(interaction);
                    break;
                case 'sebesség':
                    await handleSlashSpeed(interaction);
                    break;

                // PROFIL KEZELÉS (ÚJ!)
                case 'profil':
                    await handleSlashProfile(interaction);
                    break;

                // SABLON RENDSZER (ÚJ!)
                case 'sablon':
                    await handleSlashTemplate(interaction);
                    break;

                // EMLÉKEZTETŐK (ÚJ!)
                case 'emlékeztető':
                    await handleSlashReminder(interaction);
                    break;

                // GYORS MŰVELETEK (ÚJ!)
                case 'gyors':
                    await handleSlashQuick(interaction);
                    break;

                // ADMIN PARANCSOK
                case 'tisztít':
                    await handleSlashClear(interaction);
                    break;

                default:
                    await interaction.reply({ 
                        content: '❌ Ismeretlen parancs!', 
                        ephemeral: true 
                    });
            }
        }
        
        // Autocomplete kezelése
        else if (interaction.isAutocomplete()) {
            await handleAutocomplete(interaction);
        }
        
        // String Select Menu (Dropdown) - Régi rendszer támogatása
        else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'tribe_select') {
                await armyReportCommands.handleTribeSelection(interaction);
            }
        }
        
        // Button interakciók
        else if (interaction.isButton()) {
            const customId = interaction.customId;
            
            // Gyors seregjelentő gombok (ÚJ!)
            if (customId.startsWith('save_template_') || customId.startsWith('send_report_') || customId.startsWith('cancel_report_')) {
                await quickArmyReport.handleReportActions(interaction);
            }
            
            // Régi seregjelentő gombok
            else if (customId.startsWith('army_report_')) {
                await armyReportCommands.handleArmyReportButton(interaction);
            }
            
            // Védési kérés gombok
            else if (customId === 'defense_request_modal') {
                await defenseCommands.showDefenseModal(interaction);
            }
            else if (customId.startsWith('defend_') || customId.startsWith('defense_')) {
                await defenseCommands.handleDefenseActions(interaction);
            }
        }
        
        // Modal Submit
        else if (interaction.isModalSubmit()) {
            const customId = interaction.customId;
            
            // Sablon név modal (ÚJ!)
            if (customId.startsWith('template_name_')) {
                await handleTemplateNameSubmit(interaction);
            }
            
            // Régi seregjelentő modal
            else if (customId.startsWith('army_form_')) {
                await armyReportCommands.processArmyReport(interaction);
            }
            
            // Védési kérés modalok
            else if (customId === 'defense_form') {
                await defenseCommands.processDefenseRequest(interaction);
            }
            else if (customId.startsWith('defense_units_')) {
                await defenseCommands.processDefenseUnits(interaction);
            }
        }
    } catch (error) {
        console.error('Hiba az interakció kezelésében:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: '❌ Hiba történt az interakció feldolgozásakor!', 
                ephemeral: true 
            });
        }
    }
});

// Hagyományos prefix parancsok támogatása (visszafelé kompatibilitás)
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(config.bot.prefix)) return;

    const args = message.content.slice(config.bot.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    try {
        // Travian parancsok
        if (['utazás', 'travel', 'koordináta', 'coords', 'erőforrás', 'resource', 'sebesség', 'speed', 'törzs', 'tribe', 'emlékeztető', 'remind'].includes(command)) {
            // Átirányítás slash parancsra
            const migrationEmbed = new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle('⚡ Új és Jobb Parancsok!')
                .setDescription(`A \`!${command}\` parancs helyett használd az új slash parancsokat!`)
                .addFields(
                    { name: '🚀 Új parancs', value: `\`/${command}\` - Automatikus kiegészítéssel!`, inline: false },
                    { name: '💡 Előnyök', value: '• Automatikus kiegészítés\n• Hibakezelés\n• Gyorsabb használat\n• Mobilbarát', inline: false }
                )
                .setFooter({ text: 'Gépeld be a "/" karaktert és válaszd ki a parancsot!' })
                .setTimestamp();

            await message.reply({ embeds: [migrationEmbed] });
            
            // Régi parancs továbbra is működik
            await travianCommands.handleTravianCommand(message, command, args);
        }
        
        // Seregjelentő parancs
        else if (['seregjelentő', 'army'].includes(command)) {
            const migrationEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle('⚡ Használd az új gyors seregjelentőt!')
                .setDescription('Az új `/sereg` paranccsal egy lépésben küldhetsz jelentést!')
                .addFields(
                    { name: '🚀 Új parancs', value: '`/sereg` - Minden egy helyen!', inline: false },
                    { name: '📝 Példa', value: '`/sereg törzs:római játékos:Namezor90 falu:"Erőd (15|25)" egységek:"Légió:100, Testőr:50"`', inline: false }
                )
                .setTimestamp();

            await message.reply({ embeds: [migrationEmbed] });
            // Régi rendszer is elérhető
            await armyReportCommands.handleArmyCommand(message);
        }
        
        // Védési kérés parancs
        else if (['védés', 'defense', 'védelem'].includes(command)) {
            const migrationEmbed = new EmbedBuilder()
                .setColor(config.colors.defense)
                .setTitle('🛡️ Használd az új gyors védési kérést!')
                .setDescription('Az új `/védés` paranccsal gyorsabban kérhetsz segítséget!')
                .addFields(
                    { name: '🚀 Új parancs', value: '`/védés` - Gyors és egyszerű!', inline: false }
                )
                .setTimestamp();

            await message.reply({ embeds: [migrationEmbed] });
            await defenseCommands.handleDefenseCommand(message);
        }
        
        // Általános parancsok
        else if (['help', 'parancsok', 'commands', 'ping', 'info', 'user', 'avatar', 'tisztít'].includes(command)) {
            await generalCommands.handleGeneralCommand(message, command, args);
        }
        
        // Ismeretlen parancs
        else {
            const helpEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle('❓ Ismeretlen parancs')
                .setDescription('Próbáld ki az új slash parancsokat!')
                .addFields(
                    { name: '⚡ Leggyakoribb parancsok', value: '• `/sereg` - Gyors seregjelentő\n• `/védés` - Védési kérés\n• `/utazás` - Utazási idő\n• `/törzs` - Törzs infó', inline: false },
                    { name: '📚 Teljes lista', value: 'Gépeld be a `/` karaktert és böngészd a parancsokat!', inline: false }
                )
                .setTimestamp();

            await message.reply({ embeds: [helpEmbed] });
        }
    } catch (error) {
        console.error(`Hiba a(z) ${command} parancs végrehajtásakor:`, error);
        message.reply('❌ Hiba történt a parancs végrehajtásakor!');
    }
});

// SLASH COMMAND IMPLEMENTÁCIÓK

async function handleSlashTravel(interaction) {
    const distance = interaction.options.getNumber('távolság');
    const speed = interaction.options.getNumber('sebesség');

    const travelTimeSeconds = travianCommands.calculateTravelTime(distance, speed);
    const arrivalTime = new Date(Date.now() + travelTimeSeconds * 1000);

    const travelEmbed = new EmbedBuilder()
        .setColor('#8B4513')
        .setTitle('⏱️ Utazási Idő Számítás')
        .addFields(
            { name: '📏 Távolság', value: `${distance} mező`, inline: true },
            { name: '🏃 Sebesség', value: `${speed} mező/óra`, inline: true },
            { name: '⏰ Utazási idő', value: travianCommands.formatTime(travelTimeSeconds), inline: true },
            { name: '📅 Érkezés', value: `<t:${Math.floor(arrivalTime.getTime() / 1000)}:F>`, inline: false }
        )
        .setFooter({ text: '💡 Tipp: Használd a /sebesség parancsot az egység sebességekhez!' })
        .setTimestamp();

    await interaction.reply({ embeds: [travelEmbed] });
}

async function handleSlashCoords(interaction) {
    const x1 = interaction.options.getInteger('x1');
    const y1 = interaction.options.getInteger('y1');
    const x2 = interaction.options.getInteger('x2');
    const y2 = interaction.options.getInteger('y2');

    const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

    const coordEmbed = new EmbedBuilder()
        .setColor('#4169E1')
        .setTitle('📍 Koordináta Távolság')
        .addFields(
            { name: '📌 Kiindulópont', value: `(${x1}|${y1})`, inline: true },
            { name: '🎯 Célpont', value: `(${x2}|${y2})`, inline: true },
            { name: '📏 Távolság', value: `${distance.toFixed(2)} mező`, inline: true }
        )
        .setFooter({ text: '💡 Tipp: Használd a /utazás parancsot az utazási idő számításához!' })
        .setTimestamp();

    await interaction.reply({ embeds: [coordEmbed] });
}

async function handleSlashTribe(interaction) {
    const tribeName = interaction.options.getString('név');
    // Itt az eredeti törzs info logika, de egyszerűsítve slash commandhoz
    // (A teljes implementáció a travian.js-ben van)
    
    const { getTribeData } = require('./utils/tribe-data');
    const tribeData = getTribeData(tribeName);
    
    if (!tribeData) {
        return interaction.reply({ 
            content: '❌ Ismeretlen törzs!', 
            ephemeral: true 
        });
    }

    const tribeEmbed = new EmbedBuilder()
        .setColor(tribeData.color)
        .setTitle(`${tribeData.emoji} ${tribeData.name}`)
        .setDescription('Részletes törzs információk')
        // Itt lenne a teljes törzs info...
        .setTimestamp();

    await interaction.reply({ embeds: [tribeEmbed] });
}

async function handleSlashSpeed(interaction) {
    const tribeName = interaction.options.getString('törzs');
    
    // Speed embed logic (simplified)
    const speedEmbed = new EmbedBuilder()
        .setColor('#FF6347')
        .setTitle('🏃 Egység Sebességek')
        .setDescription(tribeName ? `Szűrve: ${tribeName}` : 'Minden törzs sebességei')
        // Itt lenne a teljes sebesség lista...
        .setTimestamp();

    await interaction.reply({ embeds: [speedEmbed] });
}

async function handleSlashProfile(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'beállít':
            await handleProfileSet(interaction);
            break;
        case 'mutat':
            await handleProfileShow(interaction);
            break;
        case 'töröl':
            await handleProfileDelete(interaction);
            break;
    }
}

async function handleProfileSet(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const tribe = interaction.options.getString('törzs');
    const playerName = interaction.options.getString('játékos_név');
    const mainVillage = interaction.options.getString('fő_falu');

    try {
        const profile = await profileManager.setUserProfile(interaction.user.id, {
            playerName,
            defaultTribe: tribe,
            mainVillage: mainVillage || null
        });

        const confirmEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('✅ Profil Beállítva!')
            .setDescription('A profilod sikeresen mentve!')
            .addFields(
                { name: '👤 Játékos név', value: profile.playerName, inline: true },
                { name: '🏛️ Alapértelmezett törzs', value: profile.defaultTribe, inline: true },
                { name: '🏘️ Fő falu', value: profile.mainVillage || 'Nincs beállítva', inline: true }
            )
            .addFields({
                name: '🎯 Következő lépések',
                value: '• Használd a `/sereg` parancsot gyors jelentéshez\n• Próbáld ki a `/sablon mentés` funkciót\n• Állíts be emlékeztetőket `/emlékeztető` paranccsal',
                inline: false
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [confirmEmbed] });
    } catch (error) {
        console.error('Hiba a profil mentésénél:', error);
        await interaction.editReply({ content: '❌ Hiba a profil mentésénél!' });
    }
}

async function handleProfileShow(interaction) {
    const profile = profileManager.getUserProfile(interaction.user.id);

    if (!profile) {
        const noProfileEmbed = new EmbedBuilder()
            .setColor(config.colors.warning)
            .setTitle('📋 Nincs Beállított Profil')
            .setDescription('Még nem állítottad be a profilodat!')
            .addFields({
                name: '🚀 Kezdjük!',
                value: 'Használd a `/profil beállít` parancsot a kezdéshez!',
                inline: false
            })
            .setTimestamp();

        return interaction.reply({ embeds: [noProfileEmbed], ephemeral: true });
    }

    const profileEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('👤 A Te Profilod')
        .addFields(
            { name: '👤 Játékos név', value: profile.playerName, inline: true },
            { name: '🏛️ Alapértelmezett törzs', value: profile.defaultTribe, inline: true },
            { name: '🏘️ Fő falu', value: profile.mainVillage || 'Nincs beállítva', inline: true },
            { name: '📅 Létrehozva', value: new Date(profile.createdAt).toLocaleDateString('hu-HU'), inline: true },
            { name: '🔄 Utoljára frissítve', value: new Date(profile.updatedAt).toLocaleDateString('hu-HU'), inline: true }
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

    // Sablonok száma
    const templates = profileManager.getUserTemplates(interaction.user.id);
    profileEmbed.addFields({
        name: '📝 Sablonok',
        value: `${templates.length} mentett sablon`,
        inline: true
    });

    await interaction.reply({ embeds: [profileEmbed], ephemeral: true });
}

async function handleProfileDelete(interaction) {
    const deleted = await profileManager.deleteUserProfile(interaction.user.id);

    if (deleted) {
        const deletedEmbed = new EmbedBuilder()
            .setColor(config.colors.warning)
            .setTitle('🗑️ Profil Törölve')
            .setDescription('A profilod és az összes sablonod törölve lett!')
            .setTimestamp();

        await interaction.reply({ embeds: [deletedEmbed], ephemeral: true });
    } else {
        await interaction.reply({ 
            content: '❌ Nincs törlendő profil!', 
            ephemeral: true 
        });
    }
}

// Template kezelés implementálása a következő részben...
async function handleSlashTemplate(interaction) {
    // Template logic itt lesz implementálva
    await interaction.reply({ content: 'Sablon funkció fejlesztés alatt...', ephemeral: true });
}

async function handleSlashReminder(interaction) {
    // Reminder logic itt lesz implementálva  
    await interaction.reply({ content: 'Emlékeztető funkció fejlesztés alatt...', ephemeral: true });
}

async function handleSlashQuick(interaction) {
    // Quick actions logic itt lesz implementálva
    await interaction.reply({ content: 'Gyors műveletek fejlesztés alatt...', ephemeral: true });
}

async function handleSlashClear(interaction) {
    // Clear logic itt lesz implementálva
    await interaction.reply({ content: 'Tisztítás funkció fejlesztés alatt...', ephemeral: true });
}

async function handleAutocomplete(interaction) {
    const { commandName, options } = interaction;

    if (commandName === 'sablon') {
        const focusedOption = options.getFocused(true);
        if (focusedOption.name === 'név') {
            const templates = profileManager.getTemplateAutocomplete(
                interaction.user.id, 
                focusedOption.value
            );
            await interaction.respond(templates);
        }
    }
}

async function handleTemplateNameSubmit(interaction) {
    // Template name modal submission logic
    await interaction.reply({ content: 'Sablon név mentés fejlesztés alatt...', ephemeral: true });
}

async function handleQuickDefense(interaction) {
    // Quick defense implementation
    await interaction.reply({ content: 'Gyors védés fejlesztés alatt...', ephemeral: true });
}

// Globális hibakezelés
client.on('error', error => {
    console.error('Discord.js hiba:', error);
});

process.on('unhandledRejection', error => {
    console.error('Kezeletlen Promise elutasítás:', error);
});

// Bot indítása
client.login(config.discord.token);
