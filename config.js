// config.js - Bot konfigurációs fájl
module.exports = {
    // Discord beállítások
    discord: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.CLIENT_ID,
        guildId: process.env.GUILD_ID
    },

    // Csatorna ID-k
    channels: {
        armyReports: process.env.ARMY_REPORT_CHANNEL_ID || 'CSATORNA_ID_IDE',
        defenseCategory: process.env.DEFENSE_CATEGORY_ID || 'KATEGORIA_ID_IDE', // Védési csatornák kategóriája
        leadershipRole: process.env.LEADERSHIP_ROLE_ID || 'VEZETO_SZEREP_ID' // Vezetői szerep
    },

    // Bot beállítások
    bot: {
        prefix: '!',
        version: '2.0',
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
    }
};
