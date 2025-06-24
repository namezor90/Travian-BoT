// config.js - Bot konfigurációs fájl (JAVÍTOTT VERZIÓ)
module.exports = {
    // Discord beállítások
    discord: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.CLIENT_ID,
        guildId: process.env.GUILD_ID
    },

    // Csatorna ID-k
    channels: {
        // FONTOS: Cseréld ki ezeket a valós csatorna ID-kra!
        armyReports: process.env.ARMY_REPORT_CHANNEL_ID || '1234567890123456789', // Seregjelentések csatornája
        defenseCategory: process.env.DEFENSE_CATEGORY_ID || '1234567890123456789', // Védési csatornák kategóriája
        leadershipRole: process.env.LEADERSHIP_ROLE_ID || '1234567890123456789' // Vezetői szerep
    },

    // Bot beállítások
    bot: {
        prefix: '!',
        version: '3.0',
        activityText: '!help parancsot | Travian segítő',
        maxReminderMinutes: 1440 // 24 óra
    },

    // Védési rendszer beállítások
    defense: {
        channelNamePrefix: '🛡️-védés-',
        autoDeleteAfterHours: 48, // Automatikus törlés 48 óra után
        maxDefenders: 10, // Maximum védők száma
        reminderMinutesBefore: [60, 30, 10] // Emlékeztetők a támadás előtt (percben)
    },

    // Színek
    colors: {
        primary: '#DAA520',
        success: '#00FF00',
        error: '#FF0000',
        warning: '#FFD700',
        defense: '#4169E1',
        armyReport: '#FF6B35'
    },

    // Debug beállítások
    debug: {
        enabled: true, // Debug üzenetek bekapcsolása
        logInteractions: true, // Interakciók logolása
        logSessions: true // Session adatok logolása
    }
};
