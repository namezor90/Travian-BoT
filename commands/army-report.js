// commands/army-report.js - Egyszerűsített seregjelentő rendszer (VÉGLEGES VERZIÓ)
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
        .setTitle('⚔️ Alliance Seregjelentő v3.1')
        .setDescription('**🆕 Egyszerűsített rendszer!**\n\n**1️⃣ Válaszd ki a törzsedet**\n**2️⃣ Töltsd ki az űrlapot**\n**3️⃣ Automatikus beküldés**')
        .addFields(
            { name: '✨ Mi változott?', value: '• Egyszerűbb folyamat\n• Minden egység egy űrlapon\n• Gyorsabb és megbízhatóbb', inline: false },
            { name: '📊 Hova kerül?', value: 'A vezetők csatornájába automatikusan táblázatos formában.', inline: false }
        )
        .setFooter({ text: 'Alliance Management System v3.1 - Egyszerűsített jelentés' })
        .setTimestamp();

    await message.reply({ embeds: [reportEmbed], components: [selectRow] });
}

async function handleTribeSelection(interaction) {
    try {
        const selectedTribe = interaction.values[0];
        const tribeData = TRIBE_UNITS[selectedTribe];

        if (!tribeData) {
            await interaction.reply({ content: '❌ Ismeretlen törzs!', ephemeral: true });
            return;
        }

        console.log(`📊 Törzs kiválasztva: ${tribeData.name}`);

        // Közvetlenül a teljes űrlap megjelenítése
        await showCompleteArmyModal(interaction, selectedTribe, tribeData);

    } catch (error) {
        console.error('Hiba a törzs kiválasztásakor:', error);
        await interaction.reply({ content: '❌ Hiba történt a törzs kiválasztásakor!', ephemeral: true });
    }
}

async function showCompleteArmyModal(interaction, selectedTribe, tribeData) {
    try {
        const modal = new ModalBuilder()
            .setCustomId(`complete_army_${selectedTribe}_${Date.now()}`)
            .setTitle(`${tribeData.emoji} ${tribeData.name} - Seregjelentés`);

        // Játékos adatok
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

        // Egység adatok - minden egységet egy szöveges mezőben
        const allUnits = tribeData.units;
        const unitNames = allUnits.map(u => u.name).join(', ');
        
        const unitsData = new TextInputBuilder()
            .setCustomId('units_data')
            .setLabel('⚔️ Egységek (név: darab)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(`pl. ${allUnits[0]?.name}: 100, ${allUnits[1]?.name}: 50`)
            .setRequired(false);

        // Megjegyzés
        const notes = new TextInputBuilder()
            .setCustomId('notes')
            .setLabel('📝 Megjegyzések (opcionális)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('pl. Fejlesztés alatt, új egységek várhatóak...')
            .setRequired(false);

        const rows = [
            new ActionRowBuilder().addComponents(playerName),
            new ActionRowBuilder().addComponents(villageName),
            new ActionRowBuilder().addComponents(unitsData),
            new ActionRowBuilder().addComponents(notes)
        ];

        modal.addComponents(...rows);
        await interaction.showModal(modal);

    } catch (error) {
        console.error('Hiba a teljes űrlap megjelenítésekor:', error);
        await interaction.reply({ content: '❌ Hiba történt az űrlap megjelenítésekor!', ephemeral: true });
    }
}

async function processCompleteArmyReport(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        // Custom ID feldolgozása
        const customIdParts = interaction.customId.split('_');
        const selectedTribe = customIdParts[2];
        const tribeData = TRIBE_UNITS[selectedTribe];

        if (!tribeData) {
            await interaction.editReply({ content: '❌ Ismeretlen törzs!' });
            return;
        }

        console.log(`📊 Jelentés feldolgozása: ${tribeData.name}`);

        // Adatok kinyerése
        const playerName = interaction.fields.getTextInputValue('player_name');
        const villageName = interaction.fields.getTextInputValue('village_name');
        const unitsData = interaction.fields.getTextInputValue('units_data') || '';
        const notes = interaction.fields.getTextInputValue('notes') || '';

        // Validáció
        if (!playerName || playerName.trim().length === 0) {
            await interaction.editReply({ content: '❌ Játékos név kötelező!' });
            return;
        }

        if (!villageName || villageName.trim().length === 0) {
            await interaction.editReply({ content: '❌ Falu név kötelező!' });
            return;
        }

        // Egységek feldolgozása
        const units = parseUnitsData(unitsData, tribeData);

        console.log(`📝 Feldolgozott egységek:`, units);

        // Jelentés összeállítása és küldése
        await sendFinalReport(interaction, tribeData, {
            playerName: playerName.trim(),
            villageName: villageName.trim(),
            units,
            notes: notes.trim()
        });

    } catch (error) {
        console.error('Hiba a teljes jelentés feldolgozásakor:', error);
        
        if (interaction.deferred) {
            await interaction.editReply({ content: '❌ Hiba történt a jelentés feldolgozásakor!' });
        } else {
            await interaction.reply({ content: '❌ Hiba történt a jelentés feldolgozásakor!', ephemeral: true });
        }
    }
}

function parseUnitsData(unitsText, tribeData) {
    const units = {
        infantry: {},
        cavalry: {},
        siege: {}
    };

    if (!unitsText || unitsText.trim().length === 0) {
        return units;
    }

    // Egységek feldolgozása (név: szám formátumban)
    const unitEntries = unitsText.split(',').map(entry => entry.trim());
    
    unitEntries.forEach(entry => {
        const match = entry.match(/^(.+?):\s*(\d+)$/);
        if (match) {
            const unitName = match[1].trim();
            const count = parseInt(match[2]);
            
            // Egység keresése a törzs adatokban
            const unit = tribeData.units.find(u => 
                u.name.toLowerCase() === unitName.toLowerCase()
            );
            
            if (unit && count > 0) {
                units[unit.type][unit.name] = count;
                console.log(`✅ Egység hozzáadva: ${unit.name} (${unit.type}) - ${count} db`);
            } else {
                console.log(`⚠️ Ismeretlen egység vagy nulla érték: ${unitName} - ${count}`);
            }
        }
    });

    return units;
}

async function sendFinalReport(interaction, tribeData, data) {
    try {
        const { playerName, villageName, units, notes } = data;

        // Összesítő számítások
        const totalInfantry = Object.values(units.infantry).reduce((a, b) => a + b, 0);
        const totalCavalry = Object.values(units.cavalry).reduce((a, b) => a + b, 0);
        const totalSiege = Object.values(units.siege).reduce((a, b) => a + b, 0);
        const grandTotal = totalInfantry + totalCavalry + totalSiege;

        // Táblázatos megjelenítés
        function createUnitTable(unitObj, emoji, title) {
            if (Object.keys(unitObj).length === 0) return `${emoji} **${title}:** *Nincs egység*`;
            
            let table = `${emoji} **${title}:**\n\`\`\`\n`;
            table += '┌─────────────────────┬─────────┐\n';
            table += '│ Egység neve         │ Darab   │\n';
            table += '├─────────────────────┼─────────┤\n';
            
            for (const [name, count] of Object.entries(unitObj)) {
                const paddedName = name.padEnd(19);
                const paddedCount = count.toString().padStart(7);
                table += `│ ${paddedName} │ ${paddedCount} │\n`;
            }
            
            table += '└─────────────────────┴─────────┘\n\`\`\`';
            return table;
        }

        // Vezetői jelentés embed
        const leaderReportEmbed = new EmbedBuilder()
            .setColor(tribeData.color)
            .setTitle(`📊 ${tribeData.emoji} Új Seregjelentés - ${tribeData.name}`)
            .addFields(
                { name: '👤 Játékos', value: `**${playerName}**`, inline: true },
                { name: '🏘️ Falu', value: `**${villageName}**`, inline: true },
                { name: '🏛️ Törzs', value: `${tribeData.emoji} **${tribeData.name}**`, inline: true }
            );

        // Egységek hozzáadása
        if (Object.keys(units.infantry).length > 0) {
            const infantryTable = createUnitTable(units.infantry, '🛡️', 'Gyalogság');
            const lines = infantryTable.split('\n');
            leaderReportEmbed.addFields({ 
                name: lines[0].replace('**', '').replace(':**', ''), 
                value: lines.slice(1).join('\n'), 
                inline: false 
            });
        }

        if (Object.keys(units.cavalry).length > 0) {
            const cavalryTable = createUnitTable(units.cavalry, '🐎', 'Lovasság');
            const lines = cavalryTable.split('\n');
            leaderReportEmbed.addFields({ 
                name: lines[0].replace('**', '').replace(':**', ''), 
                value: lines.slice(1).join('\n'), 
                inline: false 
            });
        }

        if (Object.keys(units.siege).length > 0) {
            const siegeTable = createUnitTable(units.siege, '🏰', 'Ostrom');
            const lines = siegeTable.split('\n');
            leaderReportEmbed.addFields({ 
                name: lines[0].replace('**', '').replace(':**', ''), 
                value: lines.slice(1).join('\n'), 
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

        // Megjegyzés hozzáadása ha van
        if (notes.length > 0) {
            leaderReportEmbed.addFields(
                { name: '📝 Megjegyzések', value: notes, inline: false }
            );
        }

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
                console.log(`✅ Jelentés elküldve a vezetői csatornába: ${leaderChannel.name}`);
            } else {
                console.log(`❌ Vezetői csatorna nem található: ${config.channels.armyReports}`);
            }

            // Megerősítő üzenet
            const confirmEmbed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('✅ Seregjelentés Sikeresen Elküldve!')
                .setDescription(`A ${tribeData.emoji} **${tribeData.name}** jelentésed eljutott a vezetőséghez.`)
                .addFields(
                    { name: '📊 Összesítő', value: `**Játékos:** ${playerName}\n**Falu:** ${villageName}\n**Összes egység:** ${grandTotal.toLocaleString()}`, inline: false },
                    { name: '📅 Időpont', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    { name: '🆕 Rendszer', value: 'Egyszerűsített jelentés v3.1', inline: true }
                )
                .setFooter({ text: 'Alliance Management System v3.1' })
                .setTimestamp();

            await interaction.editReply({ embeds: [confirmEmbed] });

        } catch (channelError) {
            console.error('Hiba a csatorna küldésnél:', channelError);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('❌ Hiba történt!')
                .setDescription('Nem sikerült elküldeni a jelentést. Ellenőrizd a csatorna beállításokat.')
                .addFields(
                    { name: '🔧 Lehetséges megoldások', value: '• Ellenőrizd a csatorna ID-t a config.js-ben\n• Biztosítsd, hogy a bot hozzáférjen a csatornához', inline: false }
                )
                .setFooter({ text: 'Kérj segítséget egy adminisztrátortól' })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }

    } catch (error) {
        console.error('Hiba a végső jelentés küldésekor:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Kritikus hiba!')
            .setDescription('Nem sikerült összeállítani a jelentést.')
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

// RÉGI FUNKCIÓK (kompatibilitásért megtartva)
async function handleArmyReportButton(interaction) {
    await interaction.reply({ content: '❌ Ez a funkció elavult. Használd az új egyszerűsített rendszert!', ephemeral: true });
}

async function processArmyReport(interaction) {
    await interaction.reply({ content: '❌ Ez a funkció elavult. Használd az új egyszerűsített rendszert!', ephemeral: true });
}

// Placeholder funkciók a kompatibilitásért
async function processPlayerData(interaction) {
    await interaction.reply({ content: '❌ Ez a funkció elavult. Használd az új egyszerűsített rendszert!', ephemeral: true });
}

async function processInfantryData(interaction) {
    await interaction.reply({ content: '❌ Ez a funkció elavult. Használd az új egyszerűsített rendszert!', ephemeral: true });
}

async function processCavalryData(interaction) {
    await interaction.reply({ content: '❌ Ez a funkció elavult. Használd az új egyszerűsített rendszert!', ephemeral: true });
}

module.exports = {
    handleArmyCommand,
    handleTribeSelection,
    processCompleteArmyReport,
    
    // Régi funkciók (kompatibilitásért)
    handleArmyReportButton,
    processArmyReport,
    processPlayerData,
    processInfantryData,
    processCavalryData,
    
    // Export-ok
    activeReports
};
