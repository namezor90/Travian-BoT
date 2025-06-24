// commands/template-system.js - Teljes sablon rendszer implementáció
const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const config = require('../config');
const { profileManager, parseUnitsString, formatUnitsString } = require('../utils/user-profiles');
const { TRIBE_UNITS } = require('../utils/tribe-data');

async function handleSlashTemplate(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'mentés':
            await handleTemplateSave(interaction);
            break;
        case 'használ':
            await handleTemplateUse(interaction);
            break;
        case 'lista':
            await handleTemplateList(interaction);
            break;
        case 'töröl':
            await handleTemplateDelete(interaction);
            break;
    }
}

async function handleTemplateSave(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const templateName = interaction.options.getString('név');
    const tribe = interaction.options.getString('törzs');
    const unitsString = interaction.options.getString('egységek');

    try {
        // Egységek feldolgozása
        const parsedUnits = parseUnitsString(unitsString);
        
        if (Object.keys(parsedUnits).length === 0) {
            throw new Error('Nem sikerült feldolgozni az egységeket.');
        }

        // Sablon mentése
        const template = await profileManager.saveTemplate(interaction.user.id, templateName, {
            tribe: tribe,
            units: parsedUnits
        });

        const confirmEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('✅ Sablon Sikeresen Mentve!')
            .setDescription(`A **"${templateName}"** sablon el lett mentve.`)
            .addFields(
                { name: '🏛️ Törzs', value: tribe, inline: true },
                { name: '⚔️ Egységek', value: formatUnitsString(parsedUnits), inline: false },
                { name: '💡 Használat', value: `\`/sablon használ név:${templateName}\``, inline: false }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [confirmEmbed] });

    } catch (error) {
        console.error('Hiba a sablon mentésénél:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Hiba a sablon mentésénél!')
            .setDescription(error.message || 'Ismeretlen hiba történt')
            .addFields({
                name: '💡 Segítség',
                value: 'Használj ilyen formátumot:\n`Légió:100, Testőr:50, Equites:30`',
                inline: false
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleTemplateUse(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const templateName = interaction.options.getString('név');

    try {
        // Sablon keresése
        const template = profileManager.getUserTemplate(interaction.user.id, templateName);
        
        if (!template) {
            throw new Error(`Nem található "${templateName}" nevű sablon.`);
        }

        // Sablon használat növelése
        await profileManager.useTemplate(interaction.user.id, templateName);

        // Sablon adatok feldolgozása
        const tribeData = TRIBE_UNITS[template.tribe];
        const unitsString = formatUnitsString(template.units);

        // Előnézeti embed
        const previewEmbed = new EmbedBuilder()
            .setColor(tribeData.color)
            .setTitle(`📝 "${templateName}" Sablon Használata`)
            .setDescription('**Ez a sablon tartalma - használd a `/sereg` parancsot a jelentéshez!**')
            .addFields(
                { name: '🏛️ Törzs', value: `${tribeData.emoji} ${tribeData.name}`, inline: true },
                { name: '📊 Használatok', value: `${template.useCount}x`, inline: true },
                { name: '⚔️ Egységek', value: unitsString, inline: false },
                { name: '🚀 Gyors parancs', value: `\`/sereg törzs:${template.tribe} játékos:[NEVED] falu:[FALUD] egységek:"${unitsString}"\``, inline: false }
            )
            .setFooter({ text: 'Másold ki a parancsot és cseréld le a [NEVED] és [FALUD] részeket!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [previewEmbed] });

    } catch (error) {
        console.error('Hiba a sablon használatánál:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Sablon nem található!')
            .setDescription(error.message)
            .addFields({
                name: '💡 Elérhető sablonok',
                value: 'Használd a `/sablon lista` parancsot a meglévő sablonok megtekintéséhez.',
                inline: false
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleTemplateList(interaction) {
    const templates = profileManager.getUserTemplates(interaction.user.id);

    if (templates.length === 0) {
        const noTemplatesEmbed = new EmbedBuilder()
            .setColor(config.colors.warning)
            .setTitle('📝 Nincs Mentett Sablon')
            .setDescription('Még nem hoztál létre egyetlen sablont sem!')
            .addFields({
                name: '🚀 Kezdjünk!',
                value: 'Használd a `/sablon mentés` parancsot az első sablon létrehozásához.',
                inline: false
            })
            .setTimestamp();

        return interaction.reply({ embeds: [noTemplatesEmbed], ephemeral: true });
    }

    // Sablonok rendezése használat szerint
    const sortedTemplates = templates.sort((a, b) => b.useCount - a.useCount);

    const listEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`📝 Mentett Sablonok (${templates.length})`)
        .setDescription('**Az összes mentett seregjelentő sablonod:**')
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();

    // Sablonok hozzáadása mezőként
    for (let i = 0; i < Math.min(sortedTemplates.length, 10); i++) {
        const template = sortedTemplates[i];
        const tribeData = TRIBE_UNITS[template.tribe];
        const unitsPreview = Object.entries(template.units)
            .slice(0, 3)
            .map(([name, count]) => `${name}: ${count}`)
            .join(', ');
        
        const moreUnits = Object.keys(template.units).length > 3 ? '...' : '';

        listEmbed.addFields({
            name: `${i + 1}. ${tribeData.emoji} "${template.name}"`,
            value: `**Törzs:** ${template.tribe}\n**Egységek:** ${unitsPreview}${moreUnits}\n**Használva:** ${template.useCount}x\n**Parancs:** \`/sablon használ név:${template.name}\``,
            inline: false
        });
    }

    if (templates.length > 10) {
        listEmbed.setFooter({ text: `Csak az első 10 sablon van megjelenítve a ${templates.length}-ból.` });
    }

    await interaction.reply({ embeds: [listEmbed], ephemeral: true });
}

async function handleTemplateDelete(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const templateName = interaction.options.getString('név');

    try {
        const deleted = await profileManager.deleteTemplate(interaction.user.id, templateName);
        
        if (!deleted) {
            throw new Error(`Nem található "${templateName}" nevű sablon.`);
        }

        const confirmEmbed = new EmbedBuilder()
            .setColor(config.colors.warning)
            .setTitle('🗑️ Sablon Törölve')
            .setDescription(`A **"${templateName}"** sablon sikeresen törölve lett.`)
            .setTimestamp();

        await interaction.editReply({ embeds: [confirmEmbed] });

    } catch (error) {
        console.error('Hiba a sablon törlésénél:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Sablon nem található!')
            .setDescription(error.message)
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

// Sablon név modal kezelése (gyors seregjelentőből)
async function handleTemplateNameSubmit(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const templateName = interaction.fields.getTextInputValue('template_name');
    const userId = interaction.customId.replace('template_name_', '');

    // Jelentés adatok lekérése
    const reportData = global.pendingReports?.get(userId);
    if (!reportData) {
        return interaction.editReply({ 
            content: '❌ A jelentés adatok lejártak! Kérlek kezd újra.' 
        });
    }

    try {
        // Sablon mentése
        const template = await profileManager.saveTemplate(userId, templateName, {
            tribe: reportData.tribe,
            units: reportData.validatedUnits
        });

        const confirmEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('✅ Sablon Mentve!')
            .setDescription(`A **"${templateName}"** sablon el lett mentve a jelentésből.`)
            .addFields(
                { name: '🏛️ Törzs', value: reportData.tribe, inline: true },
                { name: '📊 Egységek típusai', value: `${Object.keys(reportData.validatedUnits.infantry).length} gyalogos, ${Object.keys(reportData.validatedUnits.cavalry).length} lovas, ${Object.keys(reportData.validatedUnits.siege).length} ostrom`, inline: true },
                { name: '💡 Használat', value: `\`/sablon használ név:${templateName}\``, inline: false }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [confirmEmbed] });

    } catch (error) {
        console.error('Hiba a sablon mentésénél:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('❌ Hiba a sablon mentésénél!')
            .setDescription('Nem sikerült menteni a sablont.')
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

module.exports = {
    handleSlashTemplate,
    handleTemplateNameSubmit
};
