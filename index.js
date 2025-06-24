// index.js - Fő bot fájl (Új moduláris struktúra)
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, Collection } = require('discord.js');
const config = require('./config');

// Parancs modulok importálása
const travianCommands = require('./commands/travian');
const armyReportCommands = require('./commands/army-report');
const defenseCommands = require('./commands/defense-request');
const generalCommands = require('./commands/general');

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

// Bot bejelentkezés event
client.once('ready', () => {
    console.log(`🤖 Bot bejelentkezett mint ${client.user.tag}!`);
    console.log(`📊 ${client.guilds.cache.size} szerveren vagyok jelen`);
    console.log(`🛡️ Védési rendszer aktív!`);
    
    // Bot státusz beállítása
    client.user.setActivity(config.bot.activityText, { type: ActivityType.Watching });
});

// Új tag csatlakozás
client.on('guildMemberAdd', member => {
    const welcomeEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🎉 Üdvözöllek!')
        .setDescription(`Szia ${member.user.username}! Üdvözöllek a **${member.guild.name}** szerveren!`)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

    const defaultChannel = member.guild.systemChannel;
    if (defaultChannel) {
        defaultChannel.send({ embeds: [welcomeEmbed] });
    }
});

// Üzenetek kezelése (Parancsok)
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(config.bot.prefix)) return;

    const args = message.content.slice(config.bot.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    try {
        // Travian parancsok
        if (['utazás', 'travel', 'koordináta', 'coords', 'erőforrás', 'resource', 'sebesség', 'speed', 'törzs', 'tribe', 'emlékeztető', 'remind'].includes(command)) {
            await travianCommands.handleTravianCommand(message, command, args);
        }
        
        // Seregjelentő parancs
        else if (['seregjelentő', 'army'].includes(command)) {
            await armyReportCommands.handleArmyCommand(message);
        }
        
        // Védési kérés parancs (ÚJ!)
        else if (['védés', 'defense', 'védelem'].includes(command)) {
            await defenseCommands.handleDefenseCommand(message);
        }
        
        // Általános parancsok
        else if (['help', 'parancsok', 'commands', 'ping', 'info', 'user', 'avatar', 'tisztít'].includes(command)) {
            await generalCommands.handleGeneralCommand(message, command, args);
        }
        
        // Ismeretlen parancs
        else {
            message.reply('❌ Ismeretlen parancs! Használd a `!help` parancsot a súgóért.');
        }
    } catch (error) {
        console.error(`Hiba a(z) ${command} parancs végrehajtásakor:`, error);
        message.reply('❌ Hiba történt a parancs végrehajtásakor!');
    }
});

// Interakciók kezelése (Gombok, Modalok)
client.on('interactionCreate', async interaction => {
    try {
        // String Select Menu (Dropdown)
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'tribe_select') {
                await armyReportCommands.handleTribeSelection(interaction);
            }
        }
        
        // Button interakciók
        else if (interaction.isButton()) {
            const customId = interaction.customId;
            
            // Seregjelentő gombok
            if (customId.startsWith('army_report_')) {
                await armyReportCommands.handleArmyReportButton(interaction);
            }
            
            // Védési kérés gombok (ÚJ!)
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
            
            // Seregjelentő modal
            if (customId.startsWith('army_form_')) {
                await armyReportCommands.processArmyReport(interaction);
            }
            
            // Védési kérés modal (ÚJ!)
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

// Globális hibakezelés
client.on('error', error => {
    console.error('Discord.js hiba:', error);
});

process.on('unhandledRejection', error => {
    console.error('Kezeletlen Promise elutasítás:', error);
});

// Bot indítása
client.login(config.discord.token);
