// utils/user-profiles.js - Felhasználói profilok és sablonok
const fs = require('fs').promises;
const path = require('path');

// Profilok és sablonok memóriában tárolása (production-ben adatbázis használandó)
const userProfiles = new Map();
const userTemplates = new Map();
const userReminders = new Map();

// Adatok mentése fájlba (egyszerű perzisztencia)
const DATA_DIR = './data';
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const TEMPLATES_FILE = path.join(DATA_DIR, 'templates.json');

class UserProfileManager {
    constructor() {
        this.ensureDataDir();
        this.loadData();
    }

    async ensureDataDir() {
        try {
            await fs.mkdir(DATA_DIR, { recursive: true });
        } catch (error) {
            console.error('Hiba az adatkönyvtár létrehozásakor:', error);
        }
    }

    async loadData() {
        try {
            // Profilok betöltése
            try {
                const profileData = await fs.readFile(PROFILES_FILE, 'utf8');
                const profiles = JSON.parse(profileData);
                for (const [userId, profile] of Object.entries(profiles)) {
                    userProfiles.set(userId, profile);
                }
                console.log(`📁 ${userProfiles.size} felhasználói profil betöltve`);
            } catch (error) {
                console.log('📁 Nincs meglévő profil fájl, új adatbázis létrehozása');
            }

            // Sablonok betöltése
            try {
                const templateData = await fs.readFile(TEMPLATES_FILE, 'utf8');
                const templates = JSON.parse(templateData);
                for (const [userId, userTemplateList] of Object.entries(templates)) {
                    userTemplates.set(userId, userTemplateList);
                }
                console.log(`📝 Sablonok betöltve ${userTemplates.size} felhasználóhoz`);
            } catch (error) {
                console.log('📝 Nincs meglévő sablon fájl, új adatbázis létrehozása');
            }

        } catch (error) {
            console.error('Hiba az adatok betöltésekor:', error);
        }
    }

    async saveData() {
        try {
            // Profilok mentése
            const profileData = Object.fromEntries(userProfiles);
            await fs.writeFile(PROFILES_FILE, JSON.stringify(profileData, null, 2));

            // Sablonok mentése
            const templateData = Object.fromEntries(userTemplates);
            await fs.writeFile(TEMPLATES_FILE, JSON.stringify(templateData, null, 2));
            
            console.log('💾 Adatok sikeresen mentve');
        } catch (error) {
            console.error('Hiba az adatok mentésekor:', error);
        }
    }

    // PROFIL KEZELÉS
    async setUserProfile(userId, profileData) {
        const profile = {
            playerName: profileData.playerName,
            defaultTribe: profileData.defaultTribe,
            mainVillage: profileData.mainVillage || null,
            timezone: profileData.timezone || 'Europe/Budapest',
            language: profileData.language || 'hu',
            notificationLevel: profileData.notificationLevel || 'normal',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        userProfiles.set(userId, profile);
        await this.saveData();
        return profile;
    }

    getUserProfile(userId) {
        return userProfiles.get(userId) || null;
    }

    async deleteUserProfile(userId) {
        const deleted = userProfiles.delete(userId);
        if (deleted) {
            // Sablonok is törlése
            userTemplates.delete(userId);
            await this.saveData();
        }
        return deleted;
    }

    // SABLON KEZELÉS
    async saveTemplate(userId, templateName, templateData) {
        let userTemplateList = userTemplates.get(userId) || [];
        
        // Ellenőrzés, hogy már létezik-e ilyen nevű sablon
        const existingIndex = userTemplateList.findIndex(t => t.name === templateName);
        
        const template = {
            name: templateName,
            tribe: templateData.tribe,
            units: templateData.units,
            village: templateData.village || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            useCount: 0
        };

        if (existingIndex >= 0) {
            // Felülírás
            template.useCount = userTemplateList[existingIndex].useCount;
            template.createdAt = userTemplateList[existingIndex].createdAt;
            userTemplateList[existingIndex] = template;
        } else {
            // Új sablon
            userTemplateList.push(template);
        }

        userTemplates.set(userId, userTemplateList);
        await this.saveData();
        return template;
    }

    getUserTemplates(userId) {
        return userTemplates.get(userId) || [];
    }

    getUserTemplate(userId, templateName) {
        const userTemplateList = userTemplates.get(userId) || [];
        return userTemplateList.find(t => t.name === templateName) || null;
    }

    async useTemplate(userId, templateName) {
        const userTemplateList = userTemplates.get(userId) || [];
        const template = userTemplateList.find(t => t.name === templateName);
        
        if (template) {
            template.useCount++;
            template.lastUsed = new Date().toISOString();
            await this.saveData();
            return template;
        }
        return null;
    }

    async deleteTemplate(userId, templateName) {
        let userTemplateList = userTemplates.get(userId) || [];
        const initialLength = userTemplateList.length;
        
        userTemplateList = userTemplateList.filter(t => t.name !== templateName);
        
        if (userTemplateList.length < initialLength) {
            userTemplates.set(userId, userTemplateList);
            await this.saveData();
            return true;
        }
        return false;
    }

    // EMLÉKEZTETŐ KEZELÉS
    setUserReminder(userId, reminderId, reminderData) {
        let userReminderList = userReminders.get(userId) || [];
        
        const reminder = {
            id: reminderId,
            type: reminderData.type, // 'once', 'farm', 'custom'
            message: reminderData.message,
            interval: reminderData.interval || null,
            nextRun: reminderData.nextRun,
            isActive: true,
            createdAt: new Date().toISOString()
        };

        userReminderList.push(reminder);
        userReminders.set(userId, userReminderList);
        return reminder;
    }

    getUserReminders(userId) {
        return userReminders.get(userId) || [];
    }

    stopUserReminders(userId, type = 'all') {
        let userReminderList = userReminders.get(userId) || [];
        
        if (type === 'all') {
            userReminderList = userReminderList.map(r => ({ ...r, isActive: false }));
        } else {
            userReminderList = userReminderList.map(r => 
                r.type === type ? { ...r, isActive: false } : r
            );
        }
        
        userReminders.set(userId, userReminderList);
        return userReminderList.filter(r => !r.isActive);
    }

    // STATISZTIKÁK
    getStats() {
        const totalProfiles = userProfiles.size;
        const totalTemplates = Array.from(userTemplates.values()).reduce((total, templates) => total + templates.length, 0);
        const activeReminders = Array.from(userReminders.values()).flat().filter(r => r.isActive).length;

        return {
            totalProfiles,
            totalTemplates,
            activeReminders,
            mostUsedTribes: this.getMostUsedTribes(),
            templateUsageStats: this.getTemplateUsageStats()
        };
    }

    getMostUsedTribes() {
        const tribeCount = {};
        for (const profile of userProfiles.values()) {
            const tribe = profile.defaultTribe;
            tribeCount[tribe] = (tribeCount[tribe] || 0) + 1;
        }
        return Object.entries(tribeCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
    }

    getTemplateUsageStats() {
        const allTemplates = Array.from(userTemplates.values()).flat();
        return {
            totalTemplates: allTemplates.length,
            avgUseCount: allTemplates.reduce((sum, t) => sum + t.useCount, 0) / allTemplates.length || 0,
            mostUsedTemplate: allTemplates.sort((a, b) => b.useCount - a.useCount)[0] || null
        };
    }

    // OKOS JAVASLATOK
    getSmartSuggestions(userId) {
        const profile = this.getUserProfile(userId);
        const templates = this.getUserTemplates(userId);
        const suggestions = [];

        if (!profile) {
            suggestions.push({
                type: 'setup_profile',
                priority: 'high',
                message: '💡 Állítsd be a profilodat gyorsabb parancsokért!',
                action: '/profil beállít'
            });
            return suggestions;
        }

        if (templates.length === 0) {
            suggestions.push({
                type: 'create_template',
                priority: 'medium',
                message: '📝 Hozz létre sablonokat a gyorsabb jelentésekért!',
                action: '/sablon mentés'
            });
        }

        if (templates.length > 0) {
            const mostUsed = templates.sort((a, b) => b.useCount - a.useCount)[0];
            suggestions.push({
                type: 'use_template',
                priority: 'low',
                message: `⚡ Használd a "${mostUsed.name}" sablont!`,
                action: `/sablon használ név:${mostUsed.name}`
            });
        }

        return suggestions;
    }

    // AUTOMATIKUS KIEGÉSZÍTÉS
    getTemplateAutocomplete(userId, query = '') {
        const templates = this.getUserTemplates(userId);
        return templates
            .filter(t => t.name.toLowerCase().includes(query.toLowerCase()))
            .sort((a, b) => b.useCount - a.useCount)
            .slice(0, 25) // Discord autocomplete limit
            .map(t => ({
                name: `${t.name} (${t.tribe}, ${t.useCount}x használva)`,
                value: t.name
            }));
    }
}

// Singleton példány
const profileManager = new UserProfileManager();

// Utility függvények
function parseUnitsString(unitsString) {
    const units = {};
    if (!unitsString) return units;

    // Különböző formátumok támogatása:
    // "Légió:100, Testőr:50"
    // "Légió 100, Testőr 50"
    // "100 Légió, 50 Testőr"
    
    const patterns = [
        /([^:,]+):\s*(\d+)/g,  // "Egység: szám"
        /([^,\d]+)\s+(\d+)/g,  // "Egység szám"
        /(\d+)\s+([^,\d]+)/g   // "szám Egység"
    ];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(unitsString)) !== null) {
            let unitName, count;
            
            if (pattern === patterns[2]) {
                // "szám Egység" formátum
                count = parseInt(match[1]);
                unitName = match[2].trim();
            } else {
                // "Egység szám" formátumok
                unitName = match[1].trim();
                count = parseInt(match[2]);
            }
            
            if (count > 0) {
                units[unitName] = count;
            }
        }
    }
    
    return units;
}

function formatUnitsString(units) {
    return Object.entries(units)
        .map(([name, count]) => `${name}: ${count}`)
        .join(', ');
}

module.exports = {
    profileManager,
    parseUnitsString,
    formatUnitsString
};
