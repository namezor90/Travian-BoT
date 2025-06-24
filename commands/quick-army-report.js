// commands/quick-army-report.js - Gyors seregjelentő rendszer
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
                this.fuzzyMatch(u.name, unitName)
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
                    .setLabel('
