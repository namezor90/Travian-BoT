// commands/army-report.js - Seregjelentő rendszer (JAVÍTOTT VERZIÓ)
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
    try {
        const selectedTribe = interaction.values[0];
        const tribeData = TRIBE_UNITS[selectedTribe];

        if (!tribeData) {
            await interaction.reply({ content: '❌ Ismeretlen törzs!', ephemeral: true });
            return;
        }

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

        console.log(`📊 Új session létrehozva: ${sessionId} - ${selectedTribe} törzs`);

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

    } catch (error) {
        console.error('Hiba a törzs kiválasztásakor:', error);
        await interaction.reply({ content: '❌ Hiba történt a törzs kiválasztásakor!', ephemeral: true });
    }
}

async function processPlayerData(interaction) {
    try {
        console.log(`🔍 Modal submit feldolgozása: ${interaction.customId}`);
        
        const sessionId = interaction.customId.replace('player_data_', '');
        console.log(`🆔 Session ID: ${sessionId}`);
        
        const session = activeReports.get(sessionId);
        
        if (!session) {
            console.log(`❌ Session nem található: ${sessionId}`);
            await interaction.reply({ content: '❌ Lejárt session! Kezdd újra a jelentést.', ephemeral: true });
            return;
        }

        console.log(`✅ Session megtalálva: ${session.tribe}`);

        const playerName = interaction.fields.getTextInputValue('player_name');
        const villageName = interaction.fields.getTextInputValue('village_name');

        // Adatok mentése
        session.data.playerName = playerName;
        session.data.villageName = villageName;
        session.step = 2;

        console.log(`📝 Játékos adatok mentve: ${playerName} - ${villageName}`);

        // Gyalogság modal megjelenítése
        await showInfantryModal(interaction, sessionId, session);

    } catch (error) {
        console.error('Hiba a játékos adatok feldolgozásakor:', error);
        await interaction.reply({ content: '❌ Hiba történt az adatok mentésekor!', ephemeral: true });
    }
}

async function showInfantryModal(interaction, sessionId, session) {
    try {
        const tribeData = session.tribeData;
        const infantryUnits = tribeData.units.filter(u => u.type === 'infantry');

        console.log(`🛡️ Gyalogság egységek (${tribeData.name}): ${infantryUnits.length} db`);
        console.log(`📋 Egységek:`, infantryUnits.map(u => u.name));

        // Ha nincs gyalogság, ugrás a lovasságra
        if (infantryUnits.length === 0) {
            console.log(`⚠️ Nincs gyalogság a ${tribeData.name} törzsnél, ugrás a lovasságra`);
            session.data.infantry = {};
            session.step = 3;
            await showCavalryModal(interaction, sessionId, session);
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId(`infantry_data_${sessionId}`)
            .setTitle(`${tribeData.emoji} Gyalogság Egységek`);

        const inputs = [];
        
        // Minden gyalogos egységhez külön mező (maximum 5)
        const unitsToShow = infantryUnits.slice(0, 5);
        console.log(`📝 Modal mezők létrehozása: ${unitsToShow.length} db`);
        
        unitsToShow.forEach((unit, index) => {
            console.log(`➡️ Mező ${index}: ${unit.name}`);
            const input = new TextInputBuilder()
                .setCustomId(`unit_${index}`)
                .setLabel(`🛡️ ${unit.name}`)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('0')
                .setRequired(false);
            
            inputs.push(new ActionRowBuilder().addComponents(input));
        });

        if (inputs.length === 0) {
            throw new Error('Nincsenek input mezők a modalhoz');
        }

        modal.addComponents(...inputs);
        await interaction.showModal(modal);

    } catch (error) {
        console.error('Hiba a gyalogság modal megjelenítésekor:', error);
        
        // Próbáljunk fallback módot
        try {
            session.data.infantry = {};
            session.step = 3;
            console.log(`🔄 Fallback: ugrás lovasságra`);
            await showCavalryModal(interaction, sessionId, session);
        } catch (fallbackError) {
            console.error('Fallback is sikertelen:', fallbackError);
            await interaction.reply({ content: '❌ Hiba történt a gyalogság űrlap megjelenítésekor!', ephemeral: true });
        }
    }
}

async function processInfantryData(interaction) {
    try {
        console.log(`🛡️ Gyalogság adatok feldolgozása: ${interaction.customId}`);
        
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
        infantryUnits.slice(0, 5).forEach((unit, index) => {
            try {
                const value = interaction.fields.getTextInputValue(`unit_${index}`) || '0';
                const count = parseInt(value) || 0;
                if (count > 0) {
                    session.data.infantry[unit.name] = count;
                }
            } catch (fieldError) {
                console.log(`⚠️ Hiányzó mező: unit_${index}`);
            }
        });

        session.step = 3;

        console.log(`📊 Gyalogság adatok mentve:`, session.data.infantry);

        // Lovasság modal megjelenítése
        await showCavalryModal(interaction, sessionId, session);

    } catch (error) {
        console.error('Hiba a gyalogság adatok feldolgozásakor:', error);
        await interaction.reply({ content: '❌ Hiba történt a gyalogság adatok mentésekor!', ephemeral: true });
    }
}

async function showCavalryModal(interaction, sessionId, session) {
    try {
        const tribeData = session.tribeData;
        const cavalryUnits = tribeData.units.filter(u => u.type === 'cavalry');

        console.log(`🐎 Lovasság egységek (${tribeData.name}): ${cavalryUnits.length} db`);
        console.log(`📋 Egységek:`, cavalryUnits.map(u => u.name));

        // Ha nincs lovasság, ugrás a végső jelentésre
        if (cavalryUnits.length === 0) {
            console.log(`⚠️ Nincs lovasság a ${tribeData.name} törzsnél, ugrás a végső jelentésre`);
            session.data.cavalry = {};
            session.step = 4;
            await finalizeReport(interaction, sessionId, session);
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId(`cavalry_data_${sessionId}`)
            .setTitle(`${tribeData.emoji} Lovasság Egységek`);

        const inputs = [];
        
        // Minden lovas egységhez külön mező (maximum 5)
        const unitsToShow = cavalryUnits.slice(0, 5);
        console.log(`📝 Modal mezők létrehozása: ${unitsToShow.length} db`);
        
        unitsToShow.forEach((unit, index) => {
            console.log(`➡️ Mező ${index}: ${unit.name}`);
            const input = new TextInputBuilder()
                .setCustomId(`unit_${index}`)
                .setLabel(`🐎 ${unit.name}`)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('0')
                .setRequired(false);
            
            inputs.push(new ActionRowBuilder().addComponents(input));
        });

        if (inputs.length === 0) {
            throw new Error('Nincsenek input mezők a modalhoz');
        }

        modal.addComponents(...inputs);
        await interaction.showModal(modal);

    } catch (error) {
        console.error('Hiba a lovasság modal megjelenítésekor:', error);
        
        // Próbáljunk fallback módot
        try {
            session.data.cavalry = {};
            session.step = 4;
            console.log(`🔄 Fallback: ugrás végső jelentésre`);
            await finalizeReport(interaction, sessionId, session);
        } catch (fallbackError) {
            console.error('Fallback is sikertelen:', fallbackError);
            await interaction.reply({ content: '❌ Hiba történt a lovasság űrlap megjelenítésekor!', ephemeral: true });
        }
    }
}

async function processCavalryData(interaction) {
    try {
        console.log(`🐎 Lovasság adatok feldolgozása: ${interaction.customId}`);
        
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
        cavalryUnits.slice(0, 5).forEach((unit, index) => {
            try {
                const value = interaction.fields.getTextInputValue(`unit_${index}`) || '0';
                const count = parseInt(value) || 0;
                if (count > 0) {
                    session.data.cavalry[unit.name] = count;
                }
            } catch (fieldError) {
                console.log(`⚠️ Hiányzó mező: unit_${index}`);
            }
        });

        session.step = 4;

        console.log(`📊 Lovasság adatok mentve:`, session.data.cavalry);

        // Végső jelentés összeállítása és beküldése
        await finalizeReport(interaction, sessionId, session);

    } catch (error) {
        console.error('Hiba a lovasság adatok feldolgozásakor:', error);
        await interaction.reply({ content: '❌ Hiba történt a lovasság adatok mentésekor!', ephemeral: true });
    }
}

async function finalizeReport(interaction, sessionId, session) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const { tribeData, data } = session;
        const { playerName, villageName, infantry = {}, cavalry = {} } = data;

        console.log(`📊 Végső jelentés összeállítása: ${playerName}`);

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
            const infantryTable = createUnitTable(infantry, '🛡️');
            const lines = infantryTable.split('\n');
            leaderReportEmbed.addFields({ 
                name: lines[0], 
                value: lines.slice(1).join('\n'), 
                inline: false 
            });
        }

        if (Object.keys(cavalry).length > 0) {
            const cavalryTable = createUnitTable(cavalry, '🐎');
            const lines = cavalryTable.split('\n');
            leaderReportEmbed.addFields({ 
                name: lines[0], 
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
                    { name: '🆕 Rendszer', value: 'Lépcsős jelentés v3.0', inline: true }
                )
                .setFooter({ text: 'Alliance Management System v3.0' })
                .setTimestamp();

            await interaction.editReply({ embeds: [confirmEmbed] });

            // Session törlése
            activeReports.delete(sessionId);
            console.log(`🗑️ Session törölve: ${sessionId}`);

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
        console.error('Hiba a végső jelentés összeállításakor:', error);
        
        try {
            const errorEmbed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('❌ Kritikus hiba!')
                .setDescription('Nem sikerült összeállítani a jelentést.')
                .setTimestamp();

            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        } catch (replyError) {
            console.error('Nem sikerült a hibaüzenetet elküldeni:', replyError);
        }
    }
}

// RÉGI FUNKCIÓK (kompatibilitásért megtartva, de már nem használjuk)
async function handleArmyReportButton(interaction) {
    await interaction.reply({ content: '❌ Ez a funkció elavult. Használd az új lépcsős rendszert!', ephemeral: true });
}

async function processArmyReport(interaction) {
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
