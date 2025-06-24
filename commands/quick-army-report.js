// commands/quick-army-report.js - JAVÍTOTT VERZIÓ
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const { TRIBE_UNITS } = require('../utils/tribe-data');
const { profileManager, parseUnitsString, formatUnitsString } = require('../utils/user-profiles');

async function handleQuickArmyReport(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const tribe = interaction.options.getString('törzs');
    const playerName = interaction.options.getString('játékos');
    const villageName = interaction.options.getString('falu');
    const unitsString = interaction.options.getString('egységek');

    try {
        // Profil ellenőrzése és frissítése
        let userProfile = profileManager.getUserProfile(interaction.user.id);
        const profileData = {
            playerName: playerName,
            defaultTribe: tribe,
            mainVillage: villageName
        };

        if (!userProfile) {
            userProfile = await profileManager.setUserProfile(interaction.user.id, profileData);
        } else {
            // Profil frissítése az új adatokkal
            await profileManager.setUserProfile(interaction.user.id, {
                ...userProfile,
                ...profileData,
                updatedAt: new Date().toISOString()
            });
        }

        // Egységek feldolgozása
        const parsedUnits = parseUnitsString(unitsString);
        const tribeData = TRIBE_UNITS[tribe];

        if (Object.keys(parsedUnits).length === 0) {
            throw new Error('Nem sikerült feldolgozni az egységeket. Használj ilyen formátumot: "Légió:100, Testőr:50"');
        }

        // Egységek validálása és kategorizálása
        const validatedUnits = {
            infantry: {},
            cavalry: {},
            siege: {}
        };

        let totalUnits = 0;
        const unknownUnits = [];

        for (const [unitName, count] of Object.entries(parsedUnits)) {
            const foundUnit = tribeData.units.find(u => 
                u.name.toLowerCase().includes(unitName.toLowerCase()) ||
                unitName.toLowerCase().includes(u.name.toLowerCase()) ||
                fuzzyMatch(u.name, unitName)
            );

            if (foundUnit) {
                validatedUnits[foundUnit.type][foundUnit.name] = count;
                totalUnits += count;
            } else {
                unknownUnits.push(unitName);
            }
        }

        // Seregjelentés létrehozása
        const reportEmbed = await createArmyReportEmbed(
            tribeData, 
            playerName, 
            villageName, 
            validatedUnits, 
            totalUnits, 
            interaction.user
        );

        // Gyors műveletek gombok
        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`save_template_${interaction.user.id}`)
                    .setLabel('📝 Sablon mentése')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`send_report_${interaction.user.id}`)
                    .setLabel('📤 Jelentés küldése')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`cancel_report_${interaction.user.id}`)
                    .setLabel('❌ Mégse')
                    .setStyle(ButtonStyle.Danger)
            );

        // Figyelmeztetések az ismeretlen egységekre
        if (unknownUnits.length > 0) {
            reportEmbed.addFields({
                name: '⚠️ Ismeretlen egységek',
                value: `Ezek az egységek nem lettek felismerve: **${unknownUnits.join(', ')}**\n\nEllenőrizd az egységnevek helyesírását!`,
                inline: false
            });
        }

        // Okos javaslatok
        const suggestions = profileManager.getSmartSuggestions(interaction.user.id);
        if (suggestions.length > 0) {
            const suggestionText = suggestions
                .filter(s => s.priority === 'high' || s.priority === 'medium')
                .slice(0, 2)
                .map(s => s.message)
                .join('\n');
            
            if (suggestionText) {
                reportEmbed.addFields({
                    name: '💡 Javaslatok',
                    value: suggestionText,
                    inline: false
                });
            }
        }

        await interaction.editReply({ 
            embeds: [reportEmbed], 
            components: [actionButtons] 
        });

        // Jelentés adatok tárolása a gombokhoz
        const reportData = {
            tribe,
            playerName,
            villageName,
            validatedUnits,
            totalUnits,
            rawUnitsString: unitsString,
            userId: interaction.user.id,
            timestamp: new Date().toISOString()
        };

        // Átmeneti tárolás a gomb kezeléshez (production-ben Redis vagy hasonló)
        global.pendingReports = global.pendingReports || new Map();
        global.pendingReports.set(interaction.user.id, reportData);

        // Automatikus törlés 10 perc után
        setTimeout(() => {
            global.pendingReports?.delete(interaction.user.id);
        }, 600000);

    } catch (error) {
        console.error('Hiba a gyors seregjelentő feldolgozásakor:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Hiba a seregjelentő feldolgozásakor')
            .setDescription(error.message || 'Ismeretlen hiba történt')
            .addFields({
                name: '💡 Segítség',
                value: 'Használj ilyen formátumot az egységeknél:\n`Légió:100, Testőr:50, Equites:30`\n\nVagy próbáld:\n`100 Légió, 50 Testőr, 30 Equites`',
                inline: false
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function createArmyReportEmbed(tribeData, playerName, villageName, validatedUnits, totalUnits, user) {
    const embed = new EmbedBuilder()
        .setColor(tribeData.color)
        .setTitle(`${tribeData.emoji} Gyors Seregjelentés - ${tribeData.name}`)
        .setDescription('**📋 Jelentés előnézet - Ellenőrizd az adatokat!**')
        .addFields(
            { name: '👤 Játékos', value: `**${playerName}**`, inline: true },
            { name: '🏘️ Falu', value: `**${villageName}**`, inline: true },
            { name: '🏛️ Törzs', value: `${tribeData.emoji} **${tribeData.name}**`, inline: true }
        );

    // Egységek hozzáadása kategóriánként
    let hasUnits = false;

    if (Object.keys(validatedUnits.infantry).length > 0) {
        hasUnits = true;
        embed.addFields({
            name: '🛡️ Gyalogság',
            value: createUnitTable(validatedUnits.infantry),
            inline: true
        });
    }

    if (Object.keys(validatedUnits.cavalry).length > 0) {
        hasUnits = true;
        embed.addFields({
            name: '🐎 Lovasság',
            value: createUnitTable(validatedUnits.cavalry),
            inline: true
        });
    }

    if (Object.keys(validatedUnits.siege).length > 0) {
        hasUnits = true;
        embed.addFields({
            name: '🏰 Ostromgépek',
            value: createUnitTable(validatedUnits.siege),
            inline: true
        });
    }

    if (!hasUnits) {
        embed.addFields({
            name: '⚠️ Figyelem',
            value: 'Nem található érvényes egység az adatok között!',
            inline: false
        });
    }

    // Összesítő
    const infantryTotal = Object.values(validatedUnits.infantry).reduce((a, b) => a + b, 0);
    const cavalryTotal = Object.values(validatedUnits.cavalry).reduce((a, b) => a + b, 0);
    const siegeTotal = Object.values(validatedUnits.siege).reduce((a, b) => a + b, 0);

    embed.addFields({
        name: '📊 Összesítő',
        value: `\`\`\`\n🛡️ Gyalogság: ${infantryTotal.toLocaleString()}\n🐎 Lovasság:  ${cavalryTotal.toLocaleString()}\n🏰 Ostrom:    ${siegeTotal.toLocaleString()}\n${'─'.repeat(25)}\n📈 Összesen:  ${totalUnits.toLocaleString()}\`\`\``,
        inline: false
    });

    embed.setThumbnail(user.displayAvatarURL())
        .setFooter({ text: `Gyors Seregjelentő v3.0 | Jelentette: ${user.username}` })
        .setTimestamp();

    return embed;
}

function createUnitTable(units) {
    if (Object.keys(units).length === 0) return '*Nincs egység*';
    
    return Object.entries(units)
        .map(([name, count]) => `**${name}:** ${count.toLocaleString()}`)
        .join('\n');
}

// Fuzzy string matching egyszerű implementáció
function fuzzyMatch(str1, str2, threshold = 0.6) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
    return (longer.length - distance) / longer.length >= threshold;
}

function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// Gomb kezelések
async function handleReportActions(interaction) {
    const [action, , userId] = interaction.customId.split('_');
    
    if (interaction.user.id !== userId) {
        return interaction.reply({ 
            content: '❌ Csak a jelentés készítője használhatja ezeket a gombokat!', 
            ephemeral: true 
        });
    }

    const reportData = global.pendingReports?.get(userId);
    if (!reportData) {
        return interaction.reply({ 
            content: '❌ A jelentés adatok lejártak! Kérlek kezd újra a jelentést.', 
            ephemeral: true 
        });
    }

    switch (action) {
        case 'save':
            await handleSaveTemplate(interaction, reportData);
            break;
        case 'send':
            await handleSendReport(interaction, reportData);
            break;
        case 'cancel':
            await handleCancelReport(interaction, userId);
            break;
    }
}

async function handleSaveTemplate(interaction, reportData) {
    // Modal megjelenítése a sablon névhez
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
    
    const modal = new ModalBuilder()
        .setCustomId(`template_name_${reportData.userId}`)
        .setTitle('📝 Sablon mentése');

    const nameInput = new TextInputBuilder()
        .setCustomId('template_name')
        .setLabel('Sablon neve')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('pl. Fő sereg, Védő egységek, Támadó força')
        .setRequired(true)
        .setMaxLength(50);

    const row = new ActionRowBuilder().addComponents(nameInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

async function handleSendReport(interaction, reportData) {
    await interaction.deferUpdate();

    try {
        // Vezetői jelentés létrehozása
        const leaderReportEmbed = await createLeaderReportEmbed(reportData);
        
        // Jelentés küldése a vezetők csatornájába
        const leaderChannel = interaction.guild.channels.cache.get(config.channels.armyReports);
        if (leaderChannel) {
            await leaderChannel.send({ 
                content: `🚨 **Új ${TRIBE_UNITS[reportData.tribe].name} seregjelentés érkezett!**`, 
                embeds: [leaderReportEmbed] 
            });
        }

        // Megerősítő üzenet
        const confirmEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('✅ Seregjelentés Sikeresen Elküldve!')
            .setDescription('A jelentésed eljutott a vezetőséghez.')
            .addFields(
                { name: '📊 Részletek', value: `**Játékos:** ${reportData.playerName}\n**Falu:** ${reportData.villageName}\n**Összes egység:** ${reportData.totalUnits.toLocaleString()}`, inline: false },
                { name: '💡 Tipp', value: 'Használd a `/sablon mentés` parancsot a gyorsabb jövőbeli jelentésekhez!', inline: false }
            )
            .setTimestamp();

        await interaction.editReply({ 
            embeds: [confirmEmbed], 
            components: [] 
        });

        // Jelentés adatok törlése
        global.pendingReports?.delete(reportData.userId);

    } catch (error) {
        console.error('Hiba a jelentés küldésekor:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Hiba történt!')
            .setDescription('Nem sikerült elküldeni a jelentést. Ellenőrizd a csatorna beállításokat.')
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed], components: [] });
    }
}

async function handleCancelReport(interaction, userId) {
    global.pendingReports?.delete(userId);
    
    const cancelEmbed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('❌ Jelentés megszakítva')
        .setDescription('A seregjelentés nem lett elküldve.')
        .setTimestamp();

    await interaction.update({ embeds: [cancelEmbed], components: [] });
}

async function createLeaderReportEmbed(reportData) {
    const tribeData = TRIBE_UNITS[reportData.tribe];
    
    const embed = new EmbedBuilder()
        .setColor(tribeData.color)
        .setTitle(`📊 ${tribeData.emoji} Új Seregjelentés - ${tribeData.name}`)
        .addFields(
            { name: '👤 Játékos', value: `**${reportData.playerName}**`, inline: true },
            { name: '🏘️ Falu', value: `**${reportData.villageName}**`, inline: true },
            { name: '🏛️ Törzs', value: `${tribeData.emoji} **${tribeData.name}**`, inline: true }
        );

    // Egységek részletes táblázat
    if (Object.keys(reportData.validatedUnits.infantry).length > 0) {
        embed.addFields({
            name: '🛡️ Gyalogság',
            value: createDetailedUnitTable(reportData.validatedUnits.infantry),
            inline: false
        });
    }

    if (Object.keys(reportData.validatedUnits.cavalry).length > 0) {
        embed.addFields({
            name: '🐎 Lovasság',
            value: createDetailedUnitTable(reportData.validatedUnits.cavalry),
            inline: false
        });
    }

    if (Object.keys(reportData.validatedUnits.siege).length > 0) {
        embed.addFields({
            name: '🏰 Ostromgépek',
            value: createDetailedUnitTable(reportData.validatedUnits.siege),
            inline: false
        });
    }

    // Összesítő
    const infantryTotal = Object.values(reportData.validatedUnits.infantry).reduce((a, b) => a + b, 0);
    const cavalryTotal = Object.values(reportData.validatedUnits.cavalry).reduce((a, b) => a + b, 0);
    const siegeTotal = Object.values(reportData.validatedUnits.siege).reduce((a, b) => a + b, 0);

    embed.addFields(
        { 
            name: '📈 Összesítő', 
            value: `\`\`\`\n🛡️ Gyalogság: ${infantryTotal.toLocaleString()}\n🐎 Lovasság:  ${cavalryTotal.toLocaleString()}\n🏰 Ostrom:    ${siegeTotal.toLocaleString()}\n${'─'.repeat(25)}\n📊 Összesen:  ${reportData.totalUnits.toLocaleString()}\`\`\``, 
            inline: false 
        },
        { name: '📅 Jelentés időpontja', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        { name: '👨‍💼 Jelentette', value: `<@${reportData.userId}>`, inline: true }
    );

    embed.setFooter({ text: 'Gyors Seregjelentő v3.0 | Alliance Management System' })
        .setTimestamp();

    return embed;
}

function createDetailedUnitTable(units) {
    if (Object.keys(units).length === 0) return '*Nincs egység*';
    
    let table = '\`\`\`\n';
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

module.exports = {
    handleQuickArmyReport,
    handleReportActions,
    fuzzyMatch
};
