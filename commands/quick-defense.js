// commands/quick-defense.js - Gyors védési kérés rendszer
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const { parseTime } = require('../utils/helpers');
const { profileManager } = require('../utils/user-profiles');

async function handleQuickDefense(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const playerName = interaction.options.getString('játékos');
    const villageName = interaction.options.getString('falu');
    const attackTime = interaction.options.getString('támadás_idő');
    const wallLevel = interaction.options.getString('fal_szint') || 'Nincs megadva';
    const granaryInfo = interaction.options.getString('magtár') || 'Nincs megadva';

    try {
        // Profil ellenőrzése és frissítése
        let userProfile = profileManager.getUserProfile(interaction.user.id);
        if (!userProfile) {
            userProfile = await profileManager.setUserProfile(interaction.user.id, {
                playerName: playerName,
                defaultTribe: 'római', // Alapértelmezett
                mainVillage: villageName
            });
        }

        // Idő parsing
        const parsedAttackTime = parseTime(attackTime);
        
        // Védési csatorna létrehozása
        const channelName = `${config.defense.channelNamePrefix}${playerName.toLowerCase().replace(/\s/g, '-')}`;
        
        const defenseChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: config.channels.defenseCategory,
            topic: `Gyors védési kérés - ${playerName} (${villageName}) - Támadás: ${attackTime}`,
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

        // Védési információs embed
        const defenseInfoEmbed = new EmbedBuilder()
            .setColor(config.colors.defense)
            .setTitle('🛡️ GYORS VÉDÉSI KÉRÉS - SÜRGŐS!')
            .setDescription(`**${playerName}** sürgős védésre szorul!`)
            .addFields(
                { name: '👤 Kérelmező', value: `<@${interaction.user.id}>`, inline: true },
                { name: '🏘️ Falu', value: villageName, inline: true },
                { name: '⏰ Támadás érkezés', value: `${attackTime}${parsedAttackTime ? ` (<t:${Math.floor(parsedAttackTime.getTime() / 1000)}:R>)` : ''}`, inline: true },
                { name: '🧱 Fal szint', value: wallLevel, inline: true },
                { name: '🏺 Magtár', value: granaryInfo, inline: true },
                { name: '📊 Státusz', value: '🔴 **Védők keresése**', inline: true }
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({ text: `Gyors védési kérés | Csatorna: ${defenseChannel.id}` })
            .setTimestamp();

        // Gyors védési gombok
        const defenseButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`quick_defend_infantry`)
                    .setLabel('🛡️ Gyalogság')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`quick_defend_cavalry`)
                    .setLabel('🐎 Lovasság')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`quick_defend_mixed`)
                    .setLabel('⚔️ Vegyes')
                    .setStyle(ButtonStyle.Secondary)
            );

        const utilityButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`quick_defense_status`)
                    .setLabel('📊 Védők állapota')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`quick_defense_close`)
                    .setLabel('✅ Lezárás')
                    .setStyle(ButtonStyle.Danger)
            );

        // Üzenet küldése a védési csatornába
        await defenseChannel.send({
            content: '@everyone 🚨 **GYORS VÉDÉSI KÉRÉS!**',
            embeds: [defenseInfoEmbed],
            components: [defenseButtons, utilityButtons]
        });

        // Automatikus emlékeztetők beállítása (ha van parsed idő)
        if (parsedAttackTime) {
            await scheduleQuickReminders(parsedAttackTime, defenseChannel, playerName, villageName);
        }

        // Megerősítő üzenet
        const confirmEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('✅ Gyors Védési Kérés Létrehozva!')
            .setDescription(`Védési csatorna: ${defenseChannel}`)
            .addFields(
                { name: '📊 Részletek', value: `**Falu:** ${villageName}\n**Támadás:** ${attackTime}`, inline: false },
                { name: '🎯 Mit várj?', value: '• Védők jelentkeznek a csatornában\n• Automatikus emlékeztetők\n• Gyors koordináció', inline: false }
            );

        if (parsedAttackTime) {
            confirmEmbed.addFields({
                name: '⏰ Automatikus emlékeztetők',
                value: `🔔 **30 perc előtt:** <t:${Math.floor((parsedAttackTime.getTime() - 30*60*1000) / 1000)}:F>\n🔔 **10 perc előtt:** <t:${Math.floor((parsedAttackTime.getTime() - 10*60*1000) / 1000)}:F>`,
                inline: false
            });
        }

        confirmEmbed.setTimestamp();

        await interaction.editReply({ embeds: [confirmEmbed] });

    } catch (error) {
        console.error('Hiba a gyors védési kérés létrehozásakor:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Hiba történt!')
            .setDescription('Nem sikerült létrehozni a védési kérést.')
            .addFields({
                name: 'Lehetséges okok',
                value: '• Nincs jogosultság csatorna létrehozásához\n• Hibás kategória ID\n• Szerver hiba',
                inline: false
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

// Automatikus emlékeztetők (egyszerűsített verzió)
async function scheduleQuickReminders(attackTime, channel, playerName, villageName) {
    const now = new Date();
    const reminderTimes = [30, 10]; // perc

    for (const minutes of reminderTimes) {
        const reminderTime = new Date(attackTime.getTime() - minutes * 60 * 1000);
        
        if (reminderTime > now) {
            const delay = reminderTime.getTime() - now.getTime();
            
            setTimeout(async () => {
                const urgency = minutes <= 10 ? 'KRITIKUS' : 'SÜRGŐS';
                const emoji = minutes <= 10 ? '🚨' : '⚠️';
                const color = minutes <= 10 ? '#FF0000' : '#FF8C00';

                const reminderEmbed = new EmbedBuilder()
                    .setColor(color)
                    .setTitle(`${emoji} ${urgency} - ${minutes} perc múlva támadás!`)
                    .setDescription(`**${playerName}** (${villageName}) faluja ${minutes} perc múlva támadás alatt!`)
                    .addFields({
                        name: minutes <= 10 ? '⚡ VÉSZHELYZET!' : '🚀 Utolsó lehetőség!',
                        value: minutes <= 10 ? 
                            '• **Csak közeli** egységek érnek oda!\n• Gyors lovasság prioritás!' :
                            '• **Most küldd el** a védő egységeket!\n• Számold ki az érkezési időt!',
                        inline: false
                    })
                    .setTimestamp();

                await channel.send({
                    content: `@everyone ${emoji} **${urgency}** ${emoji}`,
                    embeds: [reminderEmbed]
                });
            }, delay);

            console.log(`⏰ Gyors emlékeztető beállítva: ${minutes} perc - ${reminderTime.toLocaleString('hu-HU')}`);
        }
    }
}

module.exports = {
    handleQuickDefense
};
