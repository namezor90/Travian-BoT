// commands/army-report.js - Seregjelentő rendszer
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');
const { TRIBE_UNITS, getTribeData } = require('../utils/tribe-data');

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
        .setTitle('⚔️ Alliance Seregjelentő v2.0')
        .setDescription('**1️⃣ Először válaszd ki a törzsedet a lenti menüből**\n\n📋 **Ezután megadhatod:**\n• 👤 Játékos és falu adatait\n• ⚔️ Egységeid számát törzsspecifikus listával')
        .addFields(
            { name: '🎯 Miért fontos?', value: 'A vezetőség ezzel tudja koordinálni a támadásokat és védelmet!', inline: false },
            { name: '📊 Hova kerül?', value: 'A vezetők csatornájába automatikusan táblázatos formában.', inline: false }
        )
        .setFooter({ text: 'Alliance Management System v2.0' })
        .setTimestamp();

    await message.reply({ embeds: [reportEmbed], components: [selectRow] });
}

async function handleTribeSelection(interaction) {
    const selectedTribe = interaction.values[0];
    const tribeData = TRIBE_UNITS[selectedTribe];

    // Űrlap gomb a kiválasztott törzzsel
    const reportButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`army_report_${selectedTribe}`)
                .setLabel(`📊 ${tribeData.name} Seregjelentő`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji(tribeData.emoji)
        );

    const confirmEmbed = new EmbedBuilder()
        .setColor(tribeData.color)
        .setTitle(`${tribeData.emoji} ${tribeData.name} - Seregjelentő`)
        .setDescription(`**2️⃣ Most kattints a gombra az űrlap kitöltéséhez!**\n\n⚔️ **Elérhető egységek:**`)
        .addFields(
            { 
                name: '🛡️ Gyalogság', 
                value: tribeData.units.filter(u => u.type === 'infantry').map(u => `• ${u.name}`).join('\n'), 
                inline: true 
            },
            { 
                name: '🐎 Lovasság', 
                value: tribeData.units.filter(u => u.type === 'cavalry').map(u => `• ${u.name}`).join('\n'), 
                inline: true 
            },
            { 
                name: '🏰 Ostrom', 
                value: tribeData.units.filter(u => u.type === 'siege').map(u => `• ${u.name}`).join('\n'), 
                inline: true 
            }
        )
        .setFooter({ text: 'Minden egységhez külön mezőt kapsz a számok megadására!' })
        .setTimestamp();

    await interaction.update({ embeds: [confirmEmbed], components: [reportButton] });
}

async function handleArmyReportButton(interaction) {
    try {
        const selectedTribe = interaction.customId.replace('army_report_', '');
        const tribeData = TRIBE_UNITS[selectedTribe];
        
        const modal = new ModalBuilder()
            .setCustomId(`army_form_${selectedTribe}`)
            .setTitle(`${tribeData.name} - Seregjelentő`);

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

        // Egységek kategóriák szerint (rövidített labelekkel)
        const infantryUnits = tribeData.units.filter(u => u.type === 'infantry');
        const cavalry = new TextInputBuilder()
            .setCustomId('infantry')
            .setLabel(`🛡️ Gyalogság`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`pl. ${infantryUnits.map((u, i) => `${u.name}: ${(i+1)*50}`).join(', ')}`)
            .setRequired(false);

        const cavalryUnits = tribeData.units.filter(u => u.type === 'cavalry');
        const cavalry2 = new TextInputBuilder()
            .setCustomId('cavalry')
            .setLabel(`🐎 Lovasság`)
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(`pl. ${cavalryUnits.map((u, i) => `${u.name}: ${(i+1)*20}`).join(', ')}`)
            .setRequired(false);

        const siegeUnits = tribeData.units.filter(u => u.type === 'siege');
        const siege = new TextInputBuilder()
            .setCustomId('siege')
            .setLabel(`🏰 Ostromgépek`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`pl. ${siegeUnits.map((u, i) => `${u.name}: ${(i+1)*5}`).join(', ')}`)
            .setRequired(false);

        // Sorok hozzáadása
        const rows = [
            new ActionRowBuilder().addComponents(playerName),
            new ActionRowBuilder().addComponents(villageName),
            new ActionRowBuilder().addComponents(cavalry),
            new ActionRowBuilder().addComponents(cavalry2),
            new ActionRowBuilder().addComponents(siege)
        ];

        modal.addComponents(...rows);
        await interaction.showModal(modal);
    } catch (error) {
        console.error('Modal hiba:', error);
        await interaction.reply({ content: '❌ Hiba az űrlap megnyitásakor!', ephemeral: true });
    }
}

async function processArmyReport(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const selectedTribe = interaction.customId.replace('army_form_', '');
    const tribeData = TRIBE_UNITS[selectedTribe];

    const playerName = interaction.fields.getTextInputValue('player_name');
    const villageName = interaction.fields.getTextInputValue('village_name');
    const infantry = interaction.fields.getTextInputValue('infantry') || '';
    const cavalry = interaction.fields.getTextInputValue('cavalry') || '';
    const siege = interaction.fields.getTextInputValue('siege') || '';

    // Egységek parsing
    function parseUnits(unitString, unitList) {
        const units = {};
        if (!unitString.trim()) return units;

        const patterns = [
            /([^:,]+):\s*(\d+)/g,  // "Egység: szám"
            /([^,\d]+)\s+(\d+)/g   // "Egység szám"
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(unitString)) !== null) {
                const unitName = match[1].trim();
                const count = parseInt(match[2]);
                
                const foundUnit = unitList.find(u => 
                    u.name.toLowerCase().includes(unitName.toLowerCase()) ||
                    unitName.toLowerCase().includes(u.name.toLowerCase())
                );
                
                if (foundUnit && count > 0) {
                    units[foundUnit.name] = count;
                }
            }
        }
        return units;
    }

    const infantryUnits = parseUnits(infantry, tribeData.units.filter(u => u.type === 'infantry'));
    const cavalryUnits = parseUnits(cavalry, tribeData.units.filter(u => u.type === 'cavalry'));
    const siegeUnits = parseUnits(siege, tribeData.units.filter(u => u.type === 'siege'));

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
    const totalInfantry = Object.values(infantryUnits).reduce((a, b) => a + b, 0);
    const totalCavalry = Object.values(cavalryUnits).reduce((a, b) => a + b, 0);
    const totalSiege = Object.values(siegeUnits).reduce((a, b) => a + b, 0);
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
    if (Object.keys(infantryUnits).length > 0) {
        leaderReportEmbed.addFields({ 
            name: createUnitTable(infantryUnits, '🛡️').split('\n')[0], 
            value: createUnitTable(infantryUnits, '🛡️').split('\n').slice(1).join('\n'), 
            inline: false 
        });
    }

    if (Object.keys(cavalryUnits).length > 0) {
        leaderReportEmbed.addFields({ 
            name: createUnitTable(cavalryUnits, '🐎').split('\n')[0], 
            value: createUnitTable(cavalryUnits, '🐎').split('\n').slice(1).join('\n'), 
            inline: false 
        });
    }

    if (Object.keys(siegeUnits).length > 0) {
        leaderReportEmbed.addFields({ 
            name: createUnitTable(siegeUnits, '🏰').split('\n')[0], 
            value: createUnitTable(siegeUnits, '🏰').split('\n').slice(1).join('\n'), 
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
                { name: '📅 Időpont', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setFooter({ text: 'Alliance Management System v2.0' })
            .setTimestamp();

        await interaction.editReply({ embeds: [confirmEmbed] });

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

module.exports = {
    handleArmyCommand,
    handleTribeSelection,
    handleArmyReportButton,
    processArmyReport
};
