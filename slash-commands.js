// slash-commands.js - Slash parancsok regisztrálása
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const commands = [
    // 1. GYORS SEREGJELENTŐ
    new SlashCommandBuilder()
        .setName('sereg')
        .setDescription('📊 Gyors seregjelentő - egy parancsban!')
        .addStringOption(option =>
            option.setName('törzs')
                .setDescription('Válaszd ki a törzsedet')
                .setRequired(true)
                .addChoices(
                    { name: '🛡️ Római Birodalom', value: 'római' },
                    { name: '⚔️ Germán Törzsek', value: 'germán' },
                    { name: '🏹 Gall Törzsek', value: 'gall' },
                    { name: '🏺 Egyiptomi Birodalom', value: 'egyiptomi' },
                    { name: '🏹 Hun Birodalom', value: 'hun' }
                ))
        .addStringOption(option =>
            option.setName('játékos')
                .setDescription('Játékos neve')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('falu')
                .setDescription('Falu neve és koordinátái pl: Erőd (15|25)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('egységek')
                .setDescription('Egységek pl: Légió:100, Testőr:50, Equites:30')
                .setRequired(true)),

    // 2. GYORS VÉDÉS
    new SlashCommandBuilder()
        .setName('védés')
        .setDescription('🛡️ Gyors védési kérés indítása')
        .addStringOption(option =>
            option.setName('játékos')
                .setDescription('Játékos neve')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('falu')
                .setDescription('Falu neve és koordinátái')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('támadás_idő')
                .setDescription('Mikor érkezik a támadás? pl: 14:30 vagy 2024.12.24 14:30')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('fal_szint')
                .setDescription('Fal szintje pl: 15')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('magtár')
                .setDescription('Magtár állapot pl: 50k búza, 80% tele')
                .setRequired(false)),

    // 3. SZÁMÍTÁSOK
    new SlashCommandBuilder()
        .setName('utazás')
        .setDescription('⏱️ Utazási idő számítása')
        .addNumberOption(option =>
            option.setName('távolság')
                .setDescription('Távolság mezőkben')
                .setRequired(true))
        .addNumberOption(option =>
            option.setName('sebesség')
                .setDescription('Egység sebessége (mező/óra)')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('koordináta')
        .setDescription('📍 Távolság számítása két koordináta között')
        .addIntegerOption(option =>
            option.setName('x1')
                .setDescription('Kiindulópont X koordinátája')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('y1')
                .setDescription('Kiindulópont Y koordinátája')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('x2')
                .setDescription('Célpont X koordinátája')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('y2')
                .setDescription('Célpont Y koordinátája')
                .setRequired(true)),

    // 4. INFORMÁCIÓK
    new SlashCommandBuilder()
        .setName('törzs')
        .setDescription('🏛️ Törzs információk megtekintése')
        .addStringOption(option =>
            option.setName('név')
                .setDescription('Válaszd ki a törzset')
                .setRequired(true)
                .addChoices(
                    { name: '🛡️ Római Birodalom', value: 'római' },
                    { name: '⚔️ Germán Törzsek', value: 'germán' },
                    { name: '🏹 Gall Törzsek', value: 'gall' },
                    { name: '🏺 Egyiptomi Birodalom', value: 'egyiptomi' },
                    { name: '🏹 Hun Birodalom', value: 'hun' }
                )),

    new SlashCommandBuilder()
        .setName('sebesség')
        .setDescription('🏃 Egység sebességek listája')
        .addStringOption(option =>
            option.setName('törzs')
                .setDescription('Szűrés törzs szerint (opcionális)')
                .setRequired(false)
                .addChoices(
                    { name: '🛡️ Római', value: 'római' },
                    { name: '⚔️ Germán', value: 'germán' },
                    { name: '🏹 Gall', value: 'gall' },
                    { name: '🏺 Egyiptomi', value: 'egyiptomi' },
                    { name: '🏹 Hun', value: 'hun' }
                )),

    // 5. PROFIL ÉS BEÁLLÍTÁSOK
    new SlashCommandBuilder()
        .setName('profil')
        .setDescription('👤 Felhasználói profil kezelése')
        .addSubcommand(subcommand =>
            subcommand
                .setName('beállít')
                .setDescription('Profil beállítása')
                .addStringOption(option =>
                    option.setName('törzs')
                        .setDescription('Alapértelmezett törzs')
                        .setRequired(true)
                        .addChoices(
                            { name: '🛡️ Római', value: 'római' },
                            { name: '⚔️ Germán', value: 'germán' },
                            { name: '🏹 Gall', value: 'gall' },
                            { name: '🏺 Egyiptomi', value: 'egyiptomi' },
                            { name: '🏹 Hun', value: 'hun' }
                        ))
                .addStringOption(option =>
                    option.setName('játékos_név')
                        .setDescription('Travian játékos neved')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('fő_falu')
                        .setDescription('Fő falud koordinátái pl: (15|25)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('mutat')
                .setDescription('Jelenlegi profil megjelenítése'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('töröl')
                .setDescription('Profil törlése')),

    // 6. SABLON RENDSZER
    new SlashCommandBuilder()
        .setName('sablon')
        .setDescription('📝 Seregjelentő sablonok kezelése')
        .addSubcommand(subcommand =>
            subcommand
                .setName('mentés')
                .setDescription('Új sablon mentése')
                .addStringOption(option =>
                    option.setName('név')
                        .setDescription('Sablon neve')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('törzs')
                        .setDescription('Törzs')
                        .setRequired(true)
                        .addChoices(
                            { name: '🛡️ Római', value: 'római' },
                            { name: '⚔️ Germán', value: 'germán' },
                            { name: '🏹 Gall', value: 'gall' },
                            { name: '🏺 Egyiptomi', value: 'egyiptomi' },
                            { name: '🏹 Hun', value: 'hun' }
                        ))
                .addStringOption(option =>
                    option.setName('egységek')
                        .setDescription('Egységek pl: Légió:100, Testőr:50')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('használ')
                .setDescription('Mentett sablon használata')
                .addStringOption(option =>
                    option.setName('név')
                        .setDescription('Sablon neve')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('lista')
                .setDescription('Mentett sablonok listája'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('töröl')
                .setDescription('Sablon törlése')
                .addStringOption(option =>
                    option.setName('név')
                        .setDescription('Törlendő sablon neve')
                        .setRequired(true)
                        .setAutocomplete(true))),

    // 7. EMLÉKEZTETŐK
    new SlashCommandBuilder()
        .setName('emlékeztető')
        .setDescription('⏰ Okos emlékeztetők beállítása')
        .addSubcommand(subcommand =>
            subcommand
                .setName('egyszer')
                .setDescription('Egyszeri emlékeztető')
                .addIntegerOption(option =>
                    option.setName('perc')
                        .setDescription('Hány perc múlva?')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1440))
                .addStringOption(option =>
                    option.setName('üzenet')
                        .setDescription('Emlékeztető szövege')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('farm')
                .setDescription('Automatikus farm emlékeztető')
                .addIntegerOption(option =>
                    option.setName('óránként')
                        .setDescription('Hány óránként? (alapértelmezett: 8)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(24)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('lista')
                .setDescription('Aktív emlékeztetők listája'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leállít')
                .setDescription('Emlékeztető leállítása')
                .addStringOption(option =>
                    option.setName('típus')
                        .setDescription('Melyik emlékeztetőt?')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Összes', value: 'all' },
                            { name: 'Farm emlékeztetők', value: 'farm' },
                            { name: 'Egyszeri emlékeztetők', value: 'once' }
                        ))),

    // 8. ADMIN PARANCSOK
    new SlashCommandBuilder()
        .setName('tisztít')
        .setDescription('🧹 Üzenetek törlése (Admin)')
        .addIntegerOption(option =>
            option.setName('darab')
                .setDescription('Hány üzenetet törölj? (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    // 9. GYORS MŰVELETEK
    new SlashCommandBuilder()
        .setName('gyors')
        .setDescription('⚡ Gyors műveletek')
        .addSubcommand(subcommand =>
            subcommand
                .setName('jelentés')
                .setDescription('Utolsó seregjelentés ismétlése új adatokkal')
                .addStringOption(option =>
                    option.setName('módosítások')
                        .setDescription('Változások pl: +50 Légió, -20 Testőr')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('koordináta')
                .setDescription('Koordináta megosztása térképpel')
                .addStringOption(option =>
                    option.setName('coords')
                        .setDescription('Koordináta pl: 15|25 vagy (15|25)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ping')
                .setDescription('Bot állapot gyors ellenőrzése'))
];

module.exports = { commands };
