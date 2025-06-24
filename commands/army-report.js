// commands/army-report.js - Seregjelentő rendszer (ÚJ LÉPCSŐS RENDSZER)
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');
const { TRIBE_UNITS, getTribeData } = require('../utils/tribe-data');

// Aktív jelentések tárolása (session data)
const activeReports = new Map();

async function handleArmyCommand(message) {
    // Törzs választó dropdown
    const tribeSelect = new StringSelectMenuBuilder()
        .setCustomId('tribe_select')
        .setPlaceholder('🏛️ Válaszd ki a törzsedet...')
        .addOptions([
            {
                label: 'Római Birodalom',
                description: 'Erős védelem, kettős építkezés',
                value: 'római',
                emoji: '🛡️'
            },
            {
                label: 'Germán Törzsek',
                description: 'Olcsó egységek, raid specialista',
                value: 'germán',
                emoji: '⚔️'
            },
            {
                label: 'Gall Törzsek',
                description: 'Gyors kereskedő, erős védelem',
                value: 'gall',
                emoji: '🏹'
            },
            {
                label: 'Egyiptomi Birodalom',
                description: 'Gyors fejlődés, nagy kapacitás',
                value: 'egyiptomi',
                emoji: '🏺'
            },
            {
                label: 'Hun Birodalom',
                description: 'Gyors lovasság, nomád előnyök',
                value: 'hun',
                emoji: '🏹'
            }
        ]);

    const selectRow = new ActionRowBuilder().addComponents(tribeSelect);

    const reportEmbed = new EmbedBuilder()
        .setColor(config.colors.armyReport)
        .setTitle('⚔️ Alliance Seregjelentő v3.0')
        .setDescription('**🆕 Új lépcsős rendszer!**\n\n**1️⃣ Válaszd ki a törzsedet**\n**2️⃣ Add meg a játékos adatokat**\n**3️⃣ Töltsd ki a gyalogság egységeket**\n**4️⃣ Töltsd ki a lovasság egységeket**\n**5️⃣ Automatikus beküldés**')
        .addFields(
            { name: '✨ Mi változott?', value: '• Törzsspecifikus egységlista\n• Csak számokat kell írni\n• Könnyebb és gyorsabb', inline: false },
            { name: '📊 Hova kerül?', value: 'A vezetők csatornájába automatikusan táblázatos formában.', inline: false }
        )
        .setFooter({ text: 'Alliance Management System v3.0 - Lépcsős jelentés' })
        .setTimestamp();

    await message.reply({ embeds: [reportEmbed], components: [selectRow] });
}

async function handleTribeSelection(interaction) {
    const selectedTribe = interaction.values[0];
    const tribeData = TRIBE_UNITS[selectedTribe];

    // Session ID generálása
    const sessionId = `report_${Date.now()}_${interaction.user.id}`;
    
    // Session adatok mentése
    activeReports.set(sessionId, {
        userId: interaction.user.id,
        tribe: selectedTribe,
        tribeData: tribeData,
        step: 1,
        data: {},
        createdAt: new Date()
    });

    // Játékos adatok modal megjelenítése
    const modal = new ModalBuilder()
        .setCustomId(`player_data_${sessionId}`)
        .setTitle(`${tribeData.emoji} ${tribeData.name} - Játékos Adatok`);

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

    const rows = [
        new ActionRowBuilder().addComponents(playerName),
        new ActionRowBuilder().addComponents(villageName)
    ];

    modal.addComponents(...rows);
    await interaction.showModal(modal);
}

async function processPlayerData(interaction) {
    const sessionId = interaction.customId.replace('player_data_', '');
    const session = activeReports.get(sessionId);
    
    if (!session) {
        await interaction.reply({ content: '❌ Lejárt session! Kezdd újra a jelentést.', ephemeral: true });
        return;
    }

    const playerName = interaction.fields.getTextInputValue('player_name');
    const villageName = interaction.fields.getTextInputValue('village_name');

    // Adatok mentése
    session.data.playerName = playerName;
    session.data.villageName = villageName;
    session.step = 2;

    // Gyalogság modal megjelenítése
    await showInfantryModal(interaction, sessionId, session);
}

async function showInfantryModal(interaction, sessionId, session) {
    const tribeData = session.tribeData;
    const infantryUnits = tribeData.units.filter(u => u.type === 'infantry');

    const modal = new ModalBuilder()
        .setCustomId(`infantry_data_${sessionId}`)
        .setTitle(`${tribeData.emoji} Gyalogság Egységek`);

    const inputs = [];
    
    // Minden gyalogos egységhez külön mező
    infantryUnits.forEach((unit, index) => {
        if (index < 5) { // Discord modal limitje: 5 mező
            const input = new TextInputBuilder()
                .setCustomId(`unit_${index}`)
                .setLabel(`🛡️ ${unit.name}`)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('0')
                .setRequired(false);
            
            inputs.push(new ActionRowBuilder().addComponents(input));
        }
    });

    modal.addComponents(...inputs);
    await interaction.showModal(modal);
}

async function processInfantryData(interaction) {
    const sessionId = interaction.customId.replace('infantry_data_', '');
    const session = activeReports.get(sessionId);
    
    if (!session) {
        await interaction.reply({ content: '❌ Lejárt session! Kezdd újra a jelentést.', ephemeral: true });
        return;
    }

    const tribeData = session.tribeData;
    const infantryUnits = tribeData.units.filter(u => u.type === 'infantry');
    
    // Gyalogság adatok mentése
    session.data.infantry = {};
    infantryUnits.forEach((unit, index) => {
        if (index < 5) {
            const value = interaction.fields.getTextInputValue(`unit_${index}`) || '0';
            const count = parseInt(value);
            if (count > 0) {
                session.data.infantry[unit.name] = count;
            }
        }
    });

    session.step = 3;

    // Lovasság modal megjelenítése
    await showCavalryModal(interaction, sessionId, session);
}

async function showCavalryModal(interaction, sessionId, session) {
    const tribeData = session.tribeData;
    const cavalryUnits = tribeData.units.filter(u => u.type === 'cavalry');

    const modal = new ModalBuilder()
        .setCustomId(`cavalry_data_${sessionId}`)
        .setTitle(`${tribeData.emoji} Lovasság Egységek`);

    const inputs = [];
    
    // Minden lovas egységhez külön mező
    cavalryUnits.forEach((unit, index) => {
        if (index < 5) { // Discord modal limitje: 5 mező
            const input = new TextInputBuilder()
                .setCustomId(`unit_${index}`)
                .setLabel(`🐎 ${unit.name}`)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('0')
                .setRequired(false);
            
            inputs.push(new ActionRowBuilder().addComponents(input));
        }
    });

    modal.addComponents(...inputs);
    await interaction.showModal(modal);
}

async function processCavalryData(interaction) {
    const sessionId = interaction.customId.replace('cavalry_data_', '');
    const session = activeReports.get(sessionId);
    
    if (!session) {
        await interaction.reply({ content: '❌ Lejárt session! Kezdd újra a jelentést.', ephemeral: true });
        return;
    }

    const tribeData = session.tribeData;
    const cavalryUnits = tribeData.units.filter(u => u.type === 'cavalry');
    
    // Lovasság adatok mentése
    session.data.cavalry = {};
    cavalryUnits.forEach((unit, index) => {
        if (index < 5) {
            const value = interaction.fields.getTextInputValue(`unit_${index}`) || '0';
            const count = parseInt(value);
            if (count > 0) {
                session.data.cavalry[unit.name] = count;
            }
        }
    });

    session.step = 4;

    // Végső jelentés összeállítása és beküldése
    await finalizeReport(interaction, sessionId, session);
}

async function finalizeReport(interaction, sessionId, session) {
    await interaction.deferReply({ ephemeral: true });

    const { tribeData, data } = session;
    const { playerName, villageName, infantry = {}, cavalry = {} } = data;

    // Ostrom egységek (alapértelmezett: 0)
    const siege = {};

    // Táblázatos megjelenítés
    function createUnitTable(units, emoji) {
        if (Object.keys(units).length === 0) return `${emoji} *Nincs egység megadva*`;
        
        let table = `${emoji} **Egységek:**\n\`\`\`\n`;
        table += '┌─────────────────────┬─────────┐\n';
        table += '│ Egység neve         │ Darab   │\n';
        table += '├─────────────────────┼─────────┤\n';
        
        for (const [name, count] of Object.entries(units)) {
            const paddedName = name.padEnd(19);
            const paddedCount = count.toString().padStart(7);
            table += `│ ${paddedName} │ ${paddedCount} │\n`;
        }
        
        table += '└─────────────────────┴─────────┘\n\`\`\`';
        return table;
    }

    // Összesítő számítások
    const totalInfantry = Object.values(infantry).reduce((a, b) => a + b, 0);
    const totalCavalry = Object.values(cavalry).reduce((a, b) => a + b, 0);
    const totalSiege = Object.values(siege).reduce((a, b) => a + b, 0);
    const grandTotal = totalInfantry + totalCavalry + totalSiege;

    // Vezetői jelentés embed
    const leaderReportEmbed = new EmbedBuilder()
        .setColor(tribeData.color)
        .setTitle(`📊 ${tribeData.emoji} Új Seregjelentés - ${tribeData.name}`)
        .addFields(
            { name: '👤 Játékos', value: `**${playerName}**`, inline: true },
            { name: '🏘️ Falu', value: `**${villageName}**`, inline: true },
            { name: '🏛️ Törzs', value: `${tribeData.emoji} **${tribeData.name}**`, inline: true }
        );

    // Egységek hozzáadása ha vannak
    if (Object.keys(infantry).length > 0) {
        leaderReportEmbed.addFields({ 
            name: createUnitTable(infantry, '🛡️').split('\n')[0], 
            value: createUnitTable(infantry, '🛡️').split('\n').slice(1).join('\n'), 
            inline: false 
        });
    }

    if (Object.keys(cavalry).length > 0) {
        leaderReportEmbed.addFields({ 
            name: createUnitTable(cavalry, '🐎').split('\n')[0], 
            value: createUnitTable(cavalry, '🐎').split('\n').slice(1).join('\n'), 
            inline: false 
        });
    }

    // Összesítő
    leaderReportEmbed.addFields(
        { 
            name: '📈 Összesítő', 
            value: `\`\`\`\n🛡️ Gyalogság: ${totalInfantry.toLocaleString()}\n🐎 Lovasság: ${totalCavalry.toLocaleString()}\n🏰 Ostrom:   ${totalSiege.toLocaleString()}\n${'─'.repeat(20)}\n📊 Összesen: ${grandTotal.toLocaleString()}\`\`\``, 
            inline: false 
        },
        { name: '📅 Jelentés időpontja', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        { name: '👨‍💼 Jelentette', value: `<@${interaction.user.id}>`, inline: true }
    );

    leaderReportEmbed.setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

    // Vezetők csatornájába küldés
    try {
        const leaderChannel = interaction.guild.channels.cache.get(config.channels.armyReports);
        if (leaderChannel) {
            await leaderChannel.send({ 
                content: `🚨 **Új ${tribeData.name} seregjelentés érkezett!**`, 
                embeds: [leaderReportEmbed] 
            });
        }

        // Megerősítő üzenet
        const confirmEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('✅ Seregjelentés Sikeresen Elküldve!')
            .setDescription(`A ${tribeData.emoji} **${tribeData.name}** jelentésed eljutott a vezetőséghez.`)
            .addFields(
                { name: '📊 Összesítő', value: `**Játékos:** ${playerName}\n**Falu:** ${villageName}\n**Összes egység:** ${grandTotal.toLocaleString()}`, inline: false },
                { name: '📅 Időpont', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '🆕 Rendszer', value: 'Lépcsős jelentés v3.0', inline: true }
            )
            .setFooter({ text: 'Alliance Management System v3.0' })
            .setTimestamp();

        await interaction.editReply({ embeds: [confirmEmbed] });

        // Session törlése
        activeReports.delete(sessionId);

    } catch (error) {
        console.error('Hiba a seregjelentés küldésénél:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Hiba történt!')
            .setDescription('Nem sikerült elküldeni a jelentést. Ellenőrizd a csatorna beállításokat.')
            .setFooter({ text: 'Kérj segítséget egy adminisztrátortól' })
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

// RÉGI FUNKCIÓK (kompatibilitásért megtartva, de már nem használjuk)
async function handleArmyReportButton(interaction) {
    // Ez már nem használatos az új rendszerben
    await interaction.reply({ content: '❌ Ez a funkció elavult. Használd az új lépcsős rendszert!', ephemeral: true });
}

async function processArmyReport(interaction) {
    // Ez már nem használatos az új rendszerben  
    await interaction.reply({ content: '❌ Ez a funkció elavult. Használd az új lépcsős rendszert!', ephemeral: true });
}

module.exports = {
    handleArmyCommand,
    handleTribeSelection,
    processPlayerData,
    processInfantryData,
    processCavalryData,
    
    // Régi funkciók (kompatibilitásért)
    handleArmyReportButton,
    processArmyReport,
    
    // Új export-ok
    activeReports
};
