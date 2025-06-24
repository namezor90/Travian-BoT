// utils/helpers.js - Általános segédfüggvények (JAVÍTOTT IDŐKEZELÉS)
const config = require('../config');

/**
 * Időformátum (másodperc -> óra:perc:másodperc)
 */
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Dátum formázása magyar nyelvre
 */
function formatDate(date) {
    return date.toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Számok formázása (1000 -> 1,000)
 */
function formatNumber(number) {
    return number.toLocaleString('hu-HU');
}

/**
 * Szöveg rövidítése megadott hosszra
 */
function truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Véletlenszerű szín generálása
 */
function getRandomColor() {
    const colors = [
        '#FF6B35', '#F7931E', '#FFD23F', '#06FFA5',
        '#3DFAFF', '#3D5AFE', '#651FFF', '#E91E63',
        '#FF5722', '#795548', '#607D8B', '#00BCD4'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Idő parsing különböző formátumokból (JAVÍTOTT)
 */
function parseTime(timeString) {
    // "14:30" vagy "2024.12.24 14:30" formátumok támogatása
    const timeRegex = /(\d{1,2}):(\d{2})/;
    const dateTimeRegex = /(\d{4})\.(\d{1,2})\.(\d{1,2})\s+(\d{1,2}):(\d{2})/;
    
    // Teljes dátum + idő formátum
    const dateTimeMatch = timeString.match(dateTimeRegex);
    if (dateTimeMatch) {
        const [, year, month, day, hour, minute] = dateTimeMatch;
        return new Date(year, month - 1, day, hour, minute);
    }
    
    // Csak idő formátum (pl. "14:30")
    const timeMatch = timeString.match(timeRegex);
    if (timeMatch) {
        const [, hour, minute] = timeMatch;
        const now = new Date();
        
        // Mai dátummal próbálkozzunk
        const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
        
        // JAVÍTÁS: Ha mai időpont még jövőbeli (vagy kevesebb mint 5 perc múltbeli), használjuk ma
        const timeDiff = todayTime.getTime() - now.getTime();
        const fiveMinutesInMs = 5 * 60 * 1000;
        
        if (timeDiff > -fiveMinutesInMs) {
            // Mai időpont jó (jövőbeli vagy legfeljebb 5 perce múltbeli)
            return todayTime;
        } else {
            // Ha több mint 5 perce múltbeli, akkor holnapra tesszük
            const tomorrowTime = new Date(todayTime);
            tomorrowTime.setDate(tomorrowTime.getDate() + 1);
            return tomorrowTime;
        }
    }
    
    return null;
}

/**
 * Koordináták távolságának számítása
 */
function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Utazási idő számítása
 */
function calculateTravelTime(distance, speed) {
    return Math.ceil((distance * 3600) / speed); // másodpercben
}

/**
 * Jogosultság ellenőrzése
 */
function hasPermission(member, permission) {
    return member.permissions.has(permission);
}

/**
 * Felhasználó mention biztonságos formázása
 */
function safeMention(userId) {
    return `<@${userId}>`;
}

/**
 * Csatorna mention biztonságos formázása
 */
function safeChannelMention(channelId) {
    return `<#${channelId}>`;
}

/**
 * Emoji biztonságos használata
 */
function safeEmoji(emoji) {
    return emoji || '❓';
}

/**
 * Hibakezelés wrapper
 */
async function safeExecute(fn, fallback = null) {
    try {
        return await fn();
    } catch (error) {
        console.error('Hiba a függvény végrehajtásakor:', error);
        return fallback;
    }
}

/**
 * Szöveg tisztítása (speciális karakterek eltávolítása)
 */
function sanitizeText(text) {
    return text.replace(/[^\w\s-_]/g, '').trim();
}

/**
 * Csatorna név generálása
 */
function generateChannelName(prefix, playerName) {
    const sanitized = sanitizeText(playerName.toLowerCase().replace(/\s/g, '-'));
    return `${prefix}${sanitized}`;
}

/**
 * Időzítő formázása ember-olvasható formátumba
 */
function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} nap`;
    if (hours > 0) return `${hours} óra`;
    if (minutes > 0) return `${minutes} perc`;
    return `${seconds} másodperc`;
}

/**
 * Százalék számítása
 */
function calculatePercentage(current, total) {
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
}

/**
 * Limit ellenőrzése
 */
function checkLimit(value, min, max) {
    return value >= min && value <= max;
}

/**
 * Véletlenszerű ID generálása
 */
function generateRandomId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Késleltetés (Promise-based)
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Tömbök összehasonlítása
 */
function arraysEqual(arr1, arr2) {
    return arr1.length === arr2.length && arr1.every((val, i) => val === arr2[i]);
}

/**
 * Objektum mély klónozása
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

module.exports = {
    formatTime,
    formatDate,
    formatNumber,
    truncateText,
    getRandomColor,
    parseTime,
    calculateDistance,
    calculateTravelTime,
    hasPermission,
    safeMention,
    safeChannelMention,
    safeEmoji,
    safeExecute,
    sanitizeText,
    generateChannelName,
    formatDuration,
    calculatePercentage,
    checkLimit,
    generateRandomId,
    delay,
    arraysEqual,
    deepClone
};
