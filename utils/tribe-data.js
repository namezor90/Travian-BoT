// utils/tribe-data.js - Travian törzs adatok (JAVÍTOTT VERZIÓ)
const TRIBE_UNITS = {
    'római': {
        name: 'Római Birodalom',
        color: '#DC143C',
        emoji: '🛡️',
        units: [
            { name: 'Légió', type: 'infantry', speed: 16, defense: 'high' },
            { name: 'Testőrség', type: 'infantry', speed: 18, defense: 'very_high' },
            { name: 'Birodalmi', type: 'infantry', speed: 15, defense: 'medium' },
            { name: 'Equites Legati', type: 'cavalry', speed: 16, defense: 'medium' },
            { name: 'Equites Imperatoris', type: 'cavalry', speed: 14, defense: 'high' },
            { name: 'Equites Caesaris', type: 'cavalry', speed: 19, defense: 'low' },
            { name: 'Faltörő-kos', type: 'siege', speed: 3, defense: 'very_low' },
            { name: 'Tűzkatapult', type: 'siege', speed: 3, defense: 'very_low' }
        ],
        merchant: { speed: 16, capacity: 500 }
    },
    'germán': {
        name: 'Germán Törzsek',
        color: '#228B22',
        emoji: '⚔️',
        units: [
            { name: 'Buzogányos', type: 'infantry', speed: 7, defense: 'medium' },
            { name: 'Lándzsás', type: 'infantry', speed: 6, defense: 'high' },
            { name: 'Csatabárdos', type: 'infantry', speed: 6, defense: 'low' },
            { name: 'Felderítő', type: 'cavalry', speed: 18, defense: 'very_low' },
            { name: 'Paladin', type: 'cavalry', speed: 19, defense: 'high' },
            { name: 'Teuton lovag', type: 'cavalry', speed: 19, defense: 'medium' },
            { name: 'Faltörő kos', type: 'siege', speed: 3, defense: 'very_low' },
            { name: 'Katapult', type: 'siege', speed: 3, defense: 'very_low' }
        ],
        merchant: { speed: 12, capacity: 1000 }
    },
    'gall': {
        name: 'Gall Törzsek',
        color: '#4169E1',
        emoji: '🏹',
        units: [
            { name: 'Phalanx', type: 'infantry', speed: 5, defense: 'very_high' },
            { name: 'Kardos', type: 'infantry', speed: 6, defense: 'medium' },
            { name: 'Felderítő', type: 'cavalry', speed: 17, defense: 'very_low' },
            { name: 'Theutat Villám', type: 'cavalry', speed: 19, defense: 'low' },
            { name: 'Druida lovas', type: 'cavalry', speed: 16, defense: 'high' },
            { name: 'Haeduan', type: 'cavalry', speed: 13, defense: 'very_high' },
            { name: 'Falromboló', type: 'siege', speed: 3, defense: 'very_low' },
            { name: 'Harci-katapult', type: 'siege', speed: 3, defense: 'very_low' }
        ],
        merchant: { speed: 24, capacity: 750 }
    },
    'egyiptomi': {
        name: 'Egyiptomi Birodalom',
        color: '#FFD700',
        emoji: '🏺',
        units: [
            { name: 'Rabszolgamilícia', type: 'infantry', speed: 7, defense: 'low' },
            { name: 'Kőris őr', type: 'infantry', speed: 6, defense: 'high' },
            { name: 'Khopesh harcos', type: 'infantry', speed: 6, defense: 'medium' },
            { name: 'Sopdu felfedező', type: 'cavalry', speed: 16, defense: 'very_low' },
            { name: 'Anhur őr', type: 'cavalry', speed: 14, defense: 'high' },
            { name: 'Resheph fogathajtó', type: 'cavalry', speed: 18, defense: 'low' },
            { name: 'Faltörő kos', type: 'siege', speed: 3, defense: 'very_low' },
            { name: 'Kőkatapult', type: 'siege', speed: 3, defense: 'very_low' }
        ],
        merchant: { speed: 12, capacity: 750 }
    },
    'hun': {
        name: 'Hun Birodalom',
        color: '#8B4513',
        emoji: '🏹',
        units: [
            // JAVÍTVA: Hun törzsnek is van gyalogság!
            { name: 'Zsoldos', type: 'infantry', speed: 7, defense: 'medium' },
            { name: 'Íjász', type: 'infantry', speed: 6, defense: 'high' },
            // Lovasság egységek
            { name: 'Figyelő', type: 'cavalry', speed: 14, defense: 'very_low' },
            { name: 'Sztyeppei lovas', type: 'cavalry', speed: 18, defense: 'low' },
            { name: 'Mesterlövész', type: 'cavalry', speed: 19, defense: 'medium' },
            { name: 'Martalóc', type: 'cavalry', speed: 16, defense: 'high' },
            // Ostrom egységek
            { name: 'Faltörő kos', type: 'siege', speed: 3, defense: 'very_low' },
            { name: 'Katapult', type: 'siege', speed: 3, defense: 'very_low' }
        ],
        merchant: { speed: 20, capacity: 500 }
    }
};

// Segédfüggvények
function getTribeData(tribeName) {
    const tribe = TRIBE_UNITS[tribeName.toLowerCase()];
    if (!tribe) {
        console.log(`❌ Ismeretlen törzs: ${tribeName}`);
        return null;
    }
    
    // Debug log
    console.log(`✅ Törzs betöltve: ${tribe.name}`);
    console.log(`📊 Egységek: ${tribe.units.length} db`);
    
    const infantryCount = tribe.units.filter(u => u.type === 'infantry').length;
    const cavalryCount = tribe.units.filter(u => u.type === 'cavalry').length;
    const siegeCount = tribe.units.filter(u => u.type === 'siege').length;
    
    console.log(`🛡️ Gyalogság: ${infantryCount} | 🐎 Lovasság: ${cavalryCount} | 🏰 Ostrom: ${siegeCount}`);
    
    return tribe;
}

function getAllTribes() {
    return Object.keys(TRIBE_UNITS);
}

function getUnitsByType(tribeName, type) {
    const tribe = getTribeData(tribeName);
    if (!tribe) return [];
    
    const units = tribe.units.filter(unit => unit.type === type);
    console.log(`🔍 ${type} egységek (${tribeName}): ${units.length} db`);
    
    return units;
}

function getDefenseUnits(tribeName) {
    const tribe = getTribeData(tribeName);
    if (!tribe) return [];
    
    return tribe.units.filter(unit => 
        unit.defense === 'high' || unit.defense === 'very_high'
    );
}

// Új funkció: Egység típus validáció
function validateTribeUnits(tribeName) {
    const tribe = getTribeData(tribeName);
    if (!tribe) return false;
    
    const hasInfantry = tribe.units.some(u => u.type === 'infantry');
    const hasCavalry = tribe.units.some(u => u.type === 'cavalry');
    
    console.log(`🔍 Validáció ${tribeName}: Gyalogság=${hasInfantry}, Lovasság=${hasCavalry}`);
    
    return hasInfantry && hasCavalry;
}

module.exports = {
    TRIBE_UNITS,
    getTribeData,
    getAllTribes,
    getUnitsByType,
    getDefenseUnits,
    validateTribeUnits
};
