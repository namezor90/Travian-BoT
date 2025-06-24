// commands/reminder-system.js - Teljes emlékeztető rendszer
const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { profileManager, generateRandomId } = require('../utils/user-profiles');

// Aktív emlékeztetők tárolása (memóriában - production-ben adatbázis)
const activeTimeouts = new Map();

async function handleSlashReminder(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'egyszer':
            await handleOneTimeReminder(interaction);
            break;
        case 'farm':
            await handleFarmReminder(interaction);
            break;
        case 'lista':
            await handleReminderList(interaction);
            break;
        case 'leállít':
            await handleStopReminder(interaction);
            break;
    }
}

async function handleOneTimeReminder(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const minutes = interaction.options.getInteger('perc');
    const message = interaction.options.getString('üzenet');

    if (minutes > config.bot.maxReminderMinutes) {
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Túl hosszú időtartam!')
            .setDescription(`Maximum ${config.bot.maxReminderMinutes} perc (24 óra) állítható be.`)
            .setTimestamp();

        return interaction.editReply({ embeds: [errorEmbed] });
    }

    try {
        const reminderId = generateRandomId(8);
        const targetTime = new Date(Date.now() + minutes * 60 * 1000);

        // Emlékeztető regisztrálása
        const reminder = profileManager.setUserReminder(interaction.user.id, reminderId, {
            type: 'once',
            message: message,
            nextRun: targetTime.toISOString()
        });

        // Timeout beállítása
        const timeoutId = setTimeout(async () => {
            await sendReminder(interaction, reminder);
            activeTimeouts.delete(reminderId);
        }, minutes * 60 * 1000);

        activeTimeouts.set(reminderId, timeoutId);

        const confirmEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('⏰ Emlékeztető Beállítva!')
            .setDescription(`Emlékeztetni foglak **${minutes} perc** múlva.`)
            .addFields(
                { name: '📝 Üzenet', value: message, inline: false },
                { name: '🔔 Értesítés időpontja', value: `<t:${Math.floor(targetTime.getTime() / 1000)}:F>`, inline: false },
                { name: '⏱️ Még hátra', value: `<t:${Math.floor(targetTime.getTime() / 1000)}:R>`, inline: false }
            )
            .setFooter({ text: `Emlékeztető ID: ${reminderId}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [confirmEmbed] });

    } catch (error) {
        console.error('Hiba az emlékeztető beállításánál:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Hiba történt!')
            .setDescription('Nem sikerült beállítani az emlékeztetőt.')
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleFarmReminder(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const hours = interaction.options.getInteger('óránként') || 8;

    try {
        const reminderId = generateRandomId(8);
        const nextRun = new Date(Date.now() + hours * 60 * 60 * 1000);

        // Farm emlékeztető regisztrálása
        const reminder = profileManager.setUserReminder(interaction.user.id, reminderId, {
            type: 'farm',
            message: '🚜 Farmolási emlékeztető! Ideje ellenőrizni a farmokat és erőforrásokat.',
            interval: hours * 60 * 60 * 1000, // milliszekundumban
            nextRun: nextRun.toISOString()
        });

        // Első emlékeztető beállítása
        const timeoutId = setTimeout(async () => {
            await sendFarmReminder(interaction, reminder, hours);
        }, hours * 60 * 60 * 1000);

        activeTimeouts.set(reminderId, timeoutId);

        const confirmEmbed = new EmbedBuilder()
            .setColor(config.colors.warning)
            .setTitle('🚜 Automatikus Farm Emlékeztető Beállítva!')
            .setDescription(`Emlékeztetni foglak **${hours} óránként** a farmolásra.`)
            .addFields(
                { name: '🔔 Első emlékeztető', value: `<t:${Math.floor(nextRun.getTime() / 1000)}:F>`, inline: false },
                { name: '🔄 Ismétlődés', value: `${hours} óránként`, inline: true },
                { name: '⏹️ Leállítás', value: `\`/emlékeztető leállít típus:farm\``, inline: true }
            )
            .setFooter({ text: `Farm emlékeztető ID: ${reminderId}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [confirmEmbed] });

    } catch (error) {
        console.error('Hiba a farm emlékeztető beállításánál:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Hiba történt!')
            .setDescription('Nem sikerült beállítani a farm emlékeztetőt.')
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleReminderList(interaction) {
    const reminders = profileManager.getUserReminders(interaction.user.id);
    const activeReminders = reminders.filter(r => r.isActive);

    if (activeReminders.length === 0) {
        const noRemindersEmbed = new EmbedBuilder()
            .setColor(config.colors.warning)
            .setTitle('⏰ Nincs Aktív Emlékeztető')
            .setDescription('Jelenleg nincs beállított emlékeztetőd.')
            .addFields({
                name: '🚀 Indíts egyet!',
                value: 'Használd a `/emlékeztető egyszer` vagy `/emlékeztető farm` parancsokat.',
                inline: false
            })
            .setTimestamp();

        return interaction.reply({ embeds: [noRemindersEmbed], ephemeral: true });
    }

    const listEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`⏰ Aktív Emlékeztetők (${activeReminders.length})`)
        .setDescription('**Az összes aktív emlékeztetőd:**')
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

    for (let i = 0; i < Math.min(activeReminders.length, 8);
