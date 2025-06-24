// commands/defense-request.js - Védési kérés rendszer + AUTOMATIKUS EMLÉKEZTETŐK
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const { getTribeData, getDefenseUnits } = require('../utils/tribe-data');
const { parseTime } = require('../utils/helpers');

// Aktív védési kérések tárolása (memóriában)
const activeDefenseRequests = new Map();
// Aktív emlékeztetők tárolása
const activeReminders = new Map();

async function handleDefenseCommand(message) {
    const defenseEmbed = new EmbedBuilder()
        .setColor(config.colors.defense)
        .setTitle('🛡️ Védési Kérés Rendszer')
        .setDescription('**Támadás érkezik a faluba?** Kérj segítséget az alliance-tól!')
        .addFields(
            { name: '📋 Mit kell megadni?', value: '• 👤 Játékos és falu neve\n• ⏰ Támadás érkezési időpontja\n• 🏺 Magtár állapot\n• 🧱 Fal szintje', inline: false },
            { name: '🎯 Mi történik?', value: '• Automatikus védési csatorna létrehozás\n• Védők jelentkezhetnek\n• ⚡ **Automatikus emlékeztetők** (60, 30, 10 perc előtt)', inline: false },
            { name: '⚡ Gyors használat', value: 'Kattints a gombra és töltsd ki az űrlapot!', inline: false }
        )
        .setFooter({ text: 'Alliance Defense System v2.1 - Automatikus emlékeztetőkkel!' })
        .setTimestamp();

    const requestButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('defense_request_modal')
                .setLabel('🛡️ Védési Kérés Indítása')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🚨')
        );

    await message.reply({ embeds: [defenseEmbed], components: [requestButton] });
}

async function showDefenseModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('defense_form')
        .setTitle('🛡️ Védési Kérés - Részletek');

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

    const attackTime = new TextInputBuilder()
        .setCustomId('attack_time')
        .setLabel('⏰ Támadás érkezési időpontja')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('pl. 14:30 vagy 2024.12.24 14:30')
        .setRequired(true);

    const granaryInfo = new TextInputBuilder()
        .setCustomId('granary_info')
        .setLabel('🏺 Magtár állapot')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('pl. 50k búza, 80% tele')
        .setRequired(true);

    const wallLevel = new TextInputBuilder()
        .setCustomId('wall_level')
        .setLabel('🧱 Fal szintje')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('pl. 15-ös szint')
        .setRequired(true);

    const rows = [
        new ActionRowBuilder().addComponents(playerName),
        new ActionRowBuilder().addComponents(villageName),
        new ActionRowBuilder().addComponents(attackTime),
        new ActionRowBuilder().addComponents(granaryInfo),
        new ActionRowBuilder().addComponents(wallLevel)
    ];

    modal.addComponents(...rows);
    await interaction.showModal(modal);
}

async function processDefenseRequest(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const playerName = interaction.fields.getTextInputValue('player_name');
    const villageName = interaction.fields.getTextInputValue('village_name');
    const attackTime = interaction.fields.getTextInputValue('attack_time');
    const granaryInfo = interaction.fields.getTextInputValue('granary_info');
    const wallLevel = interaction.fields.getTextInputValue('wall_level');

    try {
        // Idő parsing a támadás időpontjához
        const parsedAttackTime = parseTime(attackTime);
        
        // Védési csatorna létrehozása
        const channelName = `${config.defense.channelNamePrefix}${playerName.toLowerCase().replace(/\s/g, '-')}`;
        
        const defenseChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: config.channels.defenseCategory,
            topic: `Védési kérés - ${playerName} (${villageName}) - Támadás: ${attackTime}`,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages],
                }
            ]
        });

        // Kérés ID generálása (timestamp + channel ID utolsó 4 jegye)
        const requestId = `defense_${Date.now()}_${defenseChannel.id.slice(-4)}`;
        
        // Védési kérés adatok tárolása
        const defenseRequest = {
            channelId: defenseChannel.id,
            requesterId: interaction.user.id,
            playerName,
            villageName,
            attackTime,
            attackTimeObj: parsedAttackTime, // ÚJ: Parsed idő objektum
            granaryInfo,
            wallLevel,
            defenders: new Map(),
            createdAt: new Date()
        };
        
        activeDefenseRequests.set(requestId, defenseRequest);

        // ÚJ: AUTOMATIKUS EMLÉKEZTETŐK BEÁLLÍTÁSA
        if (parsedAttackTime) {
            await scheduleDefenseReminders(requestId, parsedAttackTime, defenseChannel, interaction.guild);
        }

        // Védési információs embed
        const defenseInfoEmbed = new EmbedBuilder()
            .setColor(config.colors.defense)
            .setTitle('🛡️ VÉDÉSI KÉRÉS - SÜRGŐS!')
            .setDescription(`**${playerName}** védésre szorul!`)
            .addFields(
                { name: '👤 Kérelmező', value: `<@${interaction.user.id}>`, inline: true },
                { name: '🏘️ Falu', value: villageName, inline: true },
                { name: '⏰ Támadás érkezés', value: `${attackTime}${parsedAttackTime ? ` (<t:${Math.floor(parsedAttackTime.getTime() / 1000)}:R>)` : ''}`, inline: true },
                { name: '🏺 Magtár állapot', value: granaryInfo, inline: true },
                { name: '🧱 Fal szint', value: wallLevel, inline: true },
                { name: '📊 Státusz', value: '🔴 **Védők keresése**', inline: true }
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({ text: `ID: ${requestId} | Csatorna: ${defenseChannel.id}` })
            .setTimestamp();

        // ÚJ: Emlékeztető információ hozzáadása
        if (parsedAttackTime) {
            defenseInfoEmbed.addFields({
                name: '⏰ Automatikus emlékeztetők',
                value: '🔔 Emlékeztetők: 60, 30, 10 perc előtt\n🚨 @everyone pingelés minden emlékeztetőnél',
                inline: false
            });
        }

        // Védési gombok
        const defenseButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`defend_infantry_${requestId}`)
                    .setLabel('🛡️ Gyalogság küldése')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`defend_cavalry_${requestId}`)
                    .setLabel('🐎 Lovasság küldése')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`defend_mixed_${requestId}`)
                    .setLabel('⚔️ Vegyes védelem')
                    .setStyle(ButtonStyle.Secondary)
            );

        const utilityButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`defense_status_${requestId}`)
                    .setLabel('📊 Védők listája')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`defense_close_${requestId}`)
                    .setLabel('✅ Védés lezárása')
                    .setStyle(ButtonStyle.Danger)
            );

        // Üzenet küldése a védési csatornába
        await defenseChannel.send({
            content: '@everyone 🚨 **SÜRGŐS VÉDÉSI KÉRÉS!**',
            embeds: [defenseInfoEmbed],
            components: [defenseButtons, utilityButtons]
        });

        // Megerősítő üzenet
        const confirmEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('✅ Védési Kérés Sikeresen Létrehozva!')
            .setDescription(`Védési csatorna létrehozva: ${defenseChannel}`)
            .addFields(
                { name: '📊 Részletek', value: `**Falu:** ${villageName}\n**Támadás:** ${attackTime}`, inline: false },
                { name: '🎯 Következő lépések', value: '• A csatornában várhatod a védőket\n• ⏰ **Automatikus emlékeztetők** érkeznek\n• A védők jelentkezhetnek gombokkal', inline: false },
                { name: '🆔 Kérés ID', value: `\`${requestId}\``, inline: false }
            );

        if (parsedAttackTime) {
            // JAVÍTVA: Helyes időpontok számítása (támadás ELŐTT, nem után)
            const reminder60 = new Date(parsedAttackTime.getTime() - 60*60*1000);
            const reminder30 = new Date(parsedAttackTime.getTime() - 30*60*1000);
            const reminder10 = new Date(parsedAttackTime.getTime() - 10*60*1000);
            
            confirmEmbed.addFields({
                name: '⏰ Emlékeztetők',
                value: `🔔 **60 perc előtt:** <t:${Math.floor(reminder60.getTime() / 1000)}:F>\n🔔 **30 perc előtt:** <t:${Math.floor(reminder30.getTime() / 1000)}:F>\n🔔 **10 perc előtt:** <t:${Math.floor(reminder10.getTime() / 1000)}:F>`,
                inline: false
            });
        } else {
            confirmEmbed.addFields({
                name: '⚠️ Figyelem',
                value: 'Nem sikerült feldolgozni a támadás időpontját - automatikus emlékeztetők nem lesznek beállítva.',
                inline: false
            });
        }

        confirmEmbed.setFooter({ text: 'Alliance Defense System v2.1' })
            .setTimestamp();

        await interaction.editReply({ embeds: [confirmEmbed] });

    } catch (error) {
        console.error('Hiba a védési kérés létrehozásakor:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Hiba történt!')
            .setDescription('Nem sikerült létrehozni a védési kérést.')
            .addFields(
                { name: 'Lehetséges okok', value: '• Nincs jogosultságom csatorna létrehozásához\n• Hibás kategória ID\n• Szerver hiba', inline: false }
            )
            .setFooter({ text: 'Kérj segítséget egy adminisztrátortól' })
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

// ÚJ FUNKCIÓ: Automatikus emlékeztetők beállítása
async function scheduleDefenseReminders(requestId, attackTime, channel, guild) {
    const now = new Date();
    const minutesBefore = config.defense.reminderMinutesBefore; // [60, 30, 10]

    console.log(`📅 Emlékeztetők beállítása: ${attackTime.toLocaleString('hu-HU')} - Kérés: ${requestId}`);

    for (const minutes of minutesBefore) {
        const reminderTime = new Date(attackTime.getTime() - minutes * 60 * 1000);
        
        // Csak jövőbeli emlékeztetőket állítsunk be
        if (reminderTime > now) {
            const delay = reminderTime.getTime() - now.getTime();
            
            const timeoutId = setTimeout(async () => {
                await sendDefenseReminder(requestId, minutes, channel, guild);
            }, delay);

            // Emlékeztető tárolása a lemondáshoz
            activeReminders.set(`${requestId}_${minutes}`, timeoutId);
            
            console.log(`⏰ Emlékeztető beállítva: ${minutes} perc - ${reminderTime.toLocaleString('hu-HU')}`);
        } else {
            console.log(`⚠️ Emlékeztető kihagyva (múltbeli): ${minutes} perc - ${reminderTime.toLocaleString('hu-HU')}`);
        }
    }
}

// ÚJ FUNKCIÓ: Emlékeztető üzenet küldése
async function sendDefenseReminder(requestId, minutesBefore, channel, guild) {
    try {
        const defenseRequest = activeDefenseRequests.get(requestId);
        
        if (!defenseRequest) {
            console.log(`❌ Védési kérés nem található: ${requestId}`);
            return;
        }

        const urgencyLevel = minutesBefore <= 10 ? 'KRITIKUS' : minutesBefore <= 30 ? 'SÜRGŐS' : 'FIGYELEM';
        const color = minutesBefore <= 10 ? '#FF0000' : minutesBefore <= 30 ? '#FF8C00' : '#FFD700';
        const emoji = minutesBefore <= 10 ? '🚨' : minutesBefore <= 30 ? '⚠️' : '⏰';

        const reminderEmbed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`${emoji} ${urgencyLevel} - Védési Emlékeztető!`)
            .setDescription(`**${minutesBefore} perc múlva érkezik a támadás!**`)
            .addFields(
                { name: '🎯 Cél', value: `**${defenseRequest.playerName}** (${defenseRequest.villageName})`, inline: true },
                { name: '⏰ Támadás érkezés', value: defenseRequest.attackTime, inline: true },
                { name: '👥 Védők száma', value: `${defenseRequest.defenders.size} védő jelentkezett`, inline: true }
            )
            .setTimestamp();

        // Speciális üzenetek különböző időpontokhoz
        if (minutesBefore === 60) {
            reminderEmbed.addFields({
                name: '📋 Teendők',
                value: '• Ellenőrizd az egységeidet\n• Számold ki az érkezési időt\n• Készítsd elő a védelmet',
                inline: false
            });
        } else if (minutesBefore === 30) {
            reminderEmbed.addFields({
                name: '🚀 Utolsó lehetőség!',
                value: '• **Most küldd el** a védő egységeket!\n• Ellenőrizd az érkezési időt\n• Koordinálj a többiekkel',
                inline: false
            });
        } else if (minutesBefore === 10) {
            reminderEmbed.addFields({
                name: '⚡ VÉSZHELYZET!',
                value: '• **Csak közeli** egységek érnek oda!\n• Gyors lovasság prioritás\n• Minden számít!',
                inline: false
            });
        }

        const reminderButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`defend_mixed_${requestId}`)
                    .setLabel('⚡ Gyors védelem')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`defense_status_${requestId}`)
                    .setLabel('📊 Védők állapota')
                    .setStyle(ButtonStyle.Secondary)
            );

        await channel.send({
            content: `@everyone ${emoji} **${urgencyLevel}** ${emoji}`,
            embeds: [reminderEmbed],
            components: [reminderButtons]
        });

        console.log(`✅ Emlékeztető elküldve: ${minutesBefore} perc - ${requestId}`);

    } catch (error) {
        console.error(`Hiba az emlékeztető küldésénél:`, error);
    }
}

// A többi függvény (handleDefenseActions, showDefenseUnitModal, stb.) marad ugyanaz...
// [Ide másolod a többi függvényt az eredeti fájlból]

async function handleDefenseActions(interaction) {
    const [action, type, ...restParts] = interaction.customId.split('_');
    const requestId = restParts.join('_');
    
    if (action !== 'defend' && action !== 'defense') return;

    let defenseRequest = activeDefenseRequests.get(requestId);
    
    if (!defenseRequest) {
        defenseRequest = await reconstructDefenseRequest(interaction, requestId);
        
        if (!defenseRequest) {
            await interaction.reply({ 
                content: '❌ Ez a védési kérés már nem aktív! (A bot újraindult - kérd egy admint, hogy indítson új kérést)', 
                ephemeral: true 
            });
            return;
        }
    }

    if (action === 'defend') {
        await showDefenseUnitModal(interaction, type, requestId);
    } else if (action === 'defense') {
        if (type === 'status') {
            await showDefenseStatus(interaction, requestId);
        } else if (type === 'close') {
            await closeDefenseRequest(interaction, requestId);
        }
    }
}

async function reconstructDefenseRequest(interaction, requestId) {
    try {
        const channelId = interaction.channel?.id;
        
        if (!channelId) return null;
        
        const reconstructedRequest = {
            channelId: channelId,
            requesterId: null,
            playerName: 'Ismeretlen játékos',
            villageName: 'Ismeretlen falu',
            attackTime: 'Ismeretlen idő',
            attackTimeObj: null, // ÚJ
            granaryInfo: 'Nincs adat',
            wallLevel: 'Nincs adat',
            defenders: new Map(),
            createdAt: new Date(),
            reconstructed: true
        };
        
        activeDefenseRequests.set(requestId, reconstructedRequest);
        
        console.log(`🔄 Védési kérés rekonstruálva: ${requestId}`);
        return reconstructedRequest;
        
    } catch (error) {
        console.error('Hiba a védési kérés rekonstruálásakor:', error);
        return null;
    }
}

async function showDefenseUnitModal(interaction, unitType, requestId) {
    const modal = new ModalBuilder()
        .setCustomId(`defense_units_${unitType}_${requestId}`)
        .setTitle(`🛡️ ${unitType.charAt(0).toUpperCase() + unitType.slice(1)} Védelem`);

    const playerName = new TextInputBuilder()
        .setCustomId('defender_name')
        .setLabel('👤 Játékos neve')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('pl. Védő123')
        .setRequired(true);

    const villageName = new TextInputBuilder()
        .setCustomId('defender_village')
        .setLabel('🏘️ Falu neve (honnan küldöd)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('pl. Támaszpont (20|30)')
        .setRequired(true);

    const units = new TextInputBuilder()
        .setCustomId('defense_units')
        .setLabel(`⚔️ ${unitType === 'infantry' ? 'Gyalogos' : unitType === 'cavalry' ? 'Lovas' : 'Vegyes'} egységek`)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('pl. Légió: 100, Testőrség: 50')
        .setRequired(true);

    const arrivalTime = new TextInputBuilder()
        .setCustomId('arrival_time')
        .setLabel('⏰ Érkezési időpont')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('pl. 14:25 (5 perccel a támadás előtt)')
        .setRequired(true);

    const rows = [
        new ActionRowBuilder().addComponents(playerName),
        new ActionRowBuilder().addComponents(villageName),
        new ActionRowBuilder().addComponents(units),
        new ActionRowBuilder().addComponents(arrivalTime)
    ];

    modal.addComponents(...rows);
    await interaction.showModal(modal);
}

async function processDefenseUnits(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const [, , unitType, ...restParts] = interaction.customId.split('_');
    const requestId = restParts.join('_');
    
    let defenseRequest = activeDefenseRequests.get(requestId);
    
    if (!defenseRequest) {
        defenseRequest = await reconstructDefenseRequest(interaction, requestId);
    }
    
    if (!defenseRequest) {
        await interaction.editReply({ content: '❌ Ez a védési kérés már nem aktív!' });
        return;
    }

    const defenderName = interaction.fields.getTextInputValue('defender_name');
    const defenderVillage = interaction.fields.getTextInputValue('defender_village');
    const defenseUnits = interaction.fields.getTextInputValue('defense_units');
    const arrivalTime = interaction.fields.getTextInputValue('arrival_time');

    const defenderId = interaction.user.id;
    defenseRequest.defenders.set(defenderId, {
        name: defenderName,
        village: defenderVillage,
        units: defenseUnits,
        arrivalTime: arrivalTime,
        type: unitType,
        userId: defenderId
    });

    const defenderEmbed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ Új Védő Jelentkezett!')
        .addFields(
            { name: '👤 Védő', value: `**${defenderName}** (<@${defenderId}>)`, inline: true },
            { name: '🏘️ Falu', value: defenderVillage, inline: true },
            { name: '⏰ Érkezés', value: arrivalTime, inline: true },
            { name: '⚔️ Egységek', value: defenseUnits, inline: false }
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

    const defenseChannel = interaction.guild.channels.cache.get(defenseRequest.channelId);
    if (defenseChannel) {
        await defenseChannel.send({ embeds: [defenderEmbed] });
    }

    await interaction.editReply({ 
        content: `✅ **Védő egységek jelentve!**\nKöszönjük a segítséget! 🛡️` 
    });
}

async function showDefenseStatus(interaction, requestId) {
    let defenseRequest = activeDefenseRequests.get(requestId);
    
    if (!defenseRequest) {
        defenseRequest = await reconstructDefenseRequest(interaction, requestId);
    }
    
    if (!defenseRequest) {
        await interaction.reply({ content: '❌ Ez a védési kérés már nem aktív!', ephemeral: true });
        return;
    }

    const defenders = Array.from(defenseRequest.defenders.values());
    
    const statusEmbed = new EmbedBuilder()
        .setColor(config.colors.defense)
        .setTitle('📊 Védési Státusz')
        .addFields(
            { name: '🎯 Kérés részletei', value: `**Falu:** ${defenseRequest.villageName}\n**Támadás:** ${defenseRequest.attackTime}\n**Fal:** ${defenseRequest.wallLevel}`, inline: false },
            { name: '👥 Védők száma', value: `**${defenders.length}** védő jelentkezett`, inline: true }
        );

    if (defenseRequest.reconstructed) {
        statusEmbed.addFields(
            { name: '⚠️ Figyelem', value: 'Ez a kérés a bot újraindítása után lett rekonstruálva. Egyes adatok hiányozhatnak.', inline: false }
        );
    }

    if (defenders.length > 0) {
        const defendersList = defenders.map((defender, index) => 
            `**${index + 1}.** ${defender.name} (${defender.village})\n   ⚔️ ${defender.units}\n   ⏰ Érkezés: ${defender.arrivalTime}`
        ).join('\n\n');

        statusEmbed.addFields(
            { name: '🛡️ Védő erők', value: defendersList.length > 1024 ? defendersList.substring(0, 1020) + '...' : defendersList, inline: false }
        );
    } else {
        statusEmbed.addFields(
            { name: '🛡️ Védő erők', value: '*Még nincs védő jelentkezve*', inline: false }
        );
    }

    await interaction.reply({ embeds: [statusEmbed], ephemeral: true });
}

async function closeDefenseRequest(interaction, requestId) {
    let defenseRequest = activeDefenseRequests.get(requestId);
    
    if (!defenseRequest) {
        defenseRequest = await reconstructDefenseRequest(interaction, requestId);
    }
    
    if (!defenseRequest) {
        await interaction.reply({ content: '❌ Ez a védési kérés már nem aktív!', ephemeral: true });
        return;
    }

    if (defenseRequest.requesterId && interaction.user.id !== defenseRequest.requesterId && !interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        await interaction.reply({ content: '❌ Csak a kérelmező vagy egy adminisztrátor zárhatja le a védési kérést!', ephemeral: true });
        return;
    }

    // ÚJ: Emlékeztetők lemondása
    cancelDefenseReminders(requestId);

    const closeEmbed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('✅ Védési Kérés Lezárva')
        .setDescription(`A védési kérés sikeresen lezárva ${interaction.user} által.`)
        .addFields(
            { name: '📊 Végső státusz', value: `**${defenseRequest.defenders.size}** védő jelentkezett összesen`, inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [closeEmbed] });

    setTimeout(async () => {
        try {
            const channel = interaction.guild.channels.cache.get(defenseRequest.channelId);
            if (channel) {
                await channel.delete('Védési kérés lezárva');
            }
        } catch (error) {
            console.error('Hiba a csatorna törlésekor:', error);
        }
    }, 3600000); // 1 óra

    activeDefenseRequests.delete(requestId);
}

// ÚJ FUNKCIÓ: Emlékeztetők lemondása
function cancelDefenseReminders(requestId) {
    const minutesBefore = config.defense.reminderMinutesBefore;
    
    for (const minutes of minutesBefore) {
        const reminderKey = `${requestId}_${minutes}`;
        const timeoutId = activeReminders.get(reminderKey);
        
        if (timeoutId) {
            clearTimeout(timeoutId);
            activeReminders.delete(reminderKey);
            console.log(`❌ Emlékeztető lemondva: ${minutes} perc - ${requestId}`);
        }
    }
}

module.exports = {
    handleDefenseCommand,
    showDefenseModal,
    processDefenseRequest,
    handleDefenseActions,
    processDefenseUnits,
    activeDefenseRequests
};
