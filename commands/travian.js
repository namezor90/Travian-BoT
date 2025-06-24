// commands/travian.js - Travian specifikus parancsok
const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { getTribeData, getAllTribes } = require('../utils/tribe-data');

// Segédfüggvények
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function calculateTravelTime(distance, speed) {
    return Math.ceil((distance * 3600) / speed); // másodpercben
}

function calculateResources(wood, clay, iron, crop, time) {
    return {
        wood: Math.floor(wood * (time / 3600)),
        clay: Math.floor(clay * (time / 3600)), 
        iron: Math.floor(iron * (time / 3600)),
        crop: Math.floor(crop * (time / 3600))
    };
}

async function handleTravianCommand(message, command, args) {
    switch (command) {
        case 'utazás':
        case 'travel':
            await handleTravelCommand(message, args);
            break;
        case 'koordináta':
        case 'coords':
            await handleCoordsCommand(message, args);
            break;
        case 'erőforrás':
        case 'resource':
            await handleResourceCommand(message, args);
            break;
        case 'sebesség':
        case 'speed':
            await handleSpeedCommand(message);
            break;
        case 'törzs':
        case 'tribe':
            await handleTribeCommand(message, args);
            break;
        case 'emlékeztető':
        case 'remind':
            await handleReminderCommand(message, args);
            break;
    }
}

async function handleTravelCommand(message, args) {
    const distance = parseFloat(args[0]);
    const speed = parseFloat(args[1]);

    if (isNaN(distance) || isNaN(speed) || distance <= 0 || speed <= 0) {
        return message.reply('❌ Használat: `!utazás [távolság] [sebesség]`\nPélda: `!utazás 15.3 19` (15.3 mező, 19 mező/óra)');
    }

    const travelTimeSeconds = calculateTravelTime(distance, speed);
    const arrivalTime = new Date(Date.now() + travelTimeSeconds * 1000);

    const travelEmbed = new EmbedBuilder()
        .setColor('#8B4513')
        .setTitle('⏱️ Utazási Idő Számítás')
        .addFields(
            { name: '📏 Távolság', value: `${distance} mező`, inline: true },
            { name: '🏃 Sebesség', value: `${speed} mező/óra`, inline: true },
            { name: '⏰ Utazási idő', value: formatTime(travelTimeSeconds), inline: true },
            { name: '📅 Érkezés', value: `<t:${Math.floor(arrivalTime.getTime() / 1000)}:F>`, inline: false }
        )
        .setTimestamp();

    await message.reply({ embeds: [travelEmbed] });
}

async function handleCoordsCommand(message, args) {
    const x1 = parseInt(args[0]);
    const y1 = parseInt(args[1]);
    const x2 = parseInt(args[2]);
    const y2 = parseInt(args[3]);

    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
        return message.reply('❌ Használat: `!koordináta [x1] [y1] [x2] [y2]`\nPélda: `!koordináta 0 0 15 20`');
    }

    const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

    const coordEmbed = new EmbedBuilder()
        .setColor('#4169E1')
        .setTitle('📍 Koordináta Távolság')
        .addFields(
            { name: '📌 Kiindulópont', value: `(${x1}|${y1})`, inline: true },
            { name: '🎯 Célpont', value: `(${x2}|${y2})`, inline: true },
            { name: '📏 Távolság', value: `${distance.toFixed(2)} mező`, inline: true }
        )
        .setTimestamp();

    await message.reply({ embeds: [coordEmbed] });
}

async function handleResourceCommand(message, args) {
    const wood = parseInt(args[0]);
    const clay = parseInt(args[1]);
    const iron = parseInt(args[2]);
    const crop = parseInt(args[3]);
    const hours = parseFloat(args[4]);

    if (isNaN(wood) || isNaN(clay) || isNaN(iron) || isNaN(crop) || isNaN(hours)) {
        return message.reply('❌ Használat: `!erőforrás [fa/óra] [agyag/óra] [vas/óra] [búza/óra] [órák száma]`\nPélda: `!erőforrás 120 100 80 50 8.5`');
    }

    const production = calculateResources(wood, clay, iron, crop, hours);

    const resourceEmbed = new EmbedBuilder()
        .setColor('#228B22')
        .setTitle('🌾 Erőforrás Termelés')
        .addFields(
            { name: '⏰ Időtartam', value: `${hours} óra`, inline: false },
            { name: '🪵 Fa', value: `${production.wood.toLocaleString()}`, inline: true },
            { name: '🏺 Agyag', value: `${production.clay.toLocaleString()}`, inline: true },
            { name: '⚙️ Vas', value: `${production.iron.toLocaleString()}`, inline: true },
            { name: '🌾 Búza', value: `${production.crop.toLocaleString()}`, inline: true },
            { name: '📊 Óránkénti termelés', value: `🪵${wood} 🏺${clay} ⚙️${iron} 🌾${crop}`, inline: false }
        )
        .setTimestamp();

    await message.reply({ embeds: [resourceEmbed] });
}

async function handleSpeedCommand(message) {
    const speedEmbed = new EmbedBuilder()
        .setColor('#FF6347')
        .setTitle('🏃 Egység Sebességek (mező/óra)')
        .addFields(
            { name: '🛡️ **RÓMAI**', value: '**Légió:** 16\n**Testőrség:** 18\n**Birodalmi:** 15\n**Equites Legati:** 16\n**Equites Imperatoris:** 14\n**Equites Caesaris:** 19\n**Faltörő-kos:** 3\n**Tűzkatapult:** 3', inline: true },
            { name: '⚔️ **GERMÁN**', value: '**Buzogányos:** 7\n**Lándzsás:** 6\n**Csatabárdos:** 6\n**Felderítő:** 18\n**Paladin:** 19\n**Teuton lovag:** 19\n**Faltörő kos:** 3\n**Katapult:** 3', inline: true },
            { name: '🏹 **GALL**', value: '**Phalanx:** 5\n**Kardos:** 6\n**Felderítő:** 17\n**Theutat Villám:** 19\n**Druida lovas:** 16\n**Haeduan:** 13\n**Falromboló:** 3\n**Harci-katapult:** 3', inline: true },
            { name: '🏺 **EGYIPTOMI**', value: '**Rabszolgamilícia:** 7\n**Kőris őr:** 6\n**Khopesh harcos:** 6\n**Sopdu felfedező:** 16\n**Anhur őr:** 14\n**Resheph fogathajtó:** 18\n**Faltörő kos:** 3\n**Kőkatapult:** 3', inline: true },
            { name: '🏹 **HUN**', value: '**Zsoldos:** 7\n**Íjász:** 6\n**Figyelő:** 14\n**Sztyeppei lovas:** 18\n**Mesterlövész:** 19\n**Martalóc:** 16\n**Faltörő kos:** 3\n**Katapult:** 3', inline: true },
            { name: '🚛 **KERESKEDŐ**', value: '**Római:** 16 mező/óra\n**Germán:** 12 mező/óra\n**Gall:** 24 mező/óra\n**Egyiptomi:** 12 mező/óra\n**Hun:** 20 mező/óra', inline: false }
        )
        .setFooter({ text: 'Normál szerver sebességek - Minden törzs adatai' })
        .setTimestamp();

    await message.reply({ embeds: [speedEmbed] });
}

async function handleTribeCommand(message, args) {
    const tribe = args[0]?.toLowerCase();
    
    if (!tribe) {
        return message.reply('❌ Használat: `!törzs [római/germán/gall/egyiptomi/hun]`\nPélda: `!törzs római`');
    }

    const tribeData = getTribeData(tribe);
    if (!tribeData) {
        return message.reply('❌ Ismeretlen törzs! Elérhető törzsek: római, germán, gall, egyiptomi, hun');
    }

    let tribeEmbed;
    
    switch (tribe) {
        case 'római':
        case 'roman':
            tribeEmbed = new EmbedBuilder()
                .setColor(tribeData.color)
                .setTitle(`${tribeData.emoji} ${tribeData.name}`)
                .addFields(
                    { name: '💪 Erősségek', value: '• Erős védelem\n• Jó építkezési bónuszok\n• Kiegyensúlyozott egységek\n• Kettős építkezés', inline: true },
                    { name: '⚖️ Gyengeségek', value: '• Drága egységek\n• Lassabb fejlődés kezdetben\n• Közepes kereskedő sebesség', inline: true },
                    { name: '🏆 Különlegességek', value: '• Kettős építkezés 10-es szinttől\n• Erős védőegységek\n• Stabil gazdaság\n• Szenátor (befolyás)', inline: false },
                    { name: '⚔️ Fő egységek', value: '**Védelem:** Légió, Testőrség\n**Támadás:** Birodalmi, Equites Caesaris\n**Felderítés:** Equites Legati', inline: false }
                );
            break;
        case 'germán':
        case 'teuton':
            tribeEmbed = new EmbedBuilder()
                .setColor(tribeData.color)
                .setTitle(`${tribeData.emoji} ${tribeData.name}`)
                .addFields(
                    { name: '💪 Erősségek', value: '• Olcsó egységek\n• Jó raiding képesség\n• Erős támadó egységek\n• Foglya ejtés', inline: true },
                    { name: '⚖️ Gyengeségek', value: '• Gyenge védelem\n• Lassú kereskedő\n• Kevesebb búza\n• Drága infrastruktúra', inline: true },
                    { name: '🏆 Különlegességek', value: '• Raktár és magtár védelem\n• Foglya ejthető\n• Falak válaszcsapás\n• Törzsi vezető (megsemmisítés)', inline: false },
                    { name: '⚔️ Fő egységek', value: '**Védelem:** Lándzsás, Paladin\n**Támadás:** Buzogányos, Csatabárdos\n**Felderítés:** Felderítő', inline: false }
                );
            break;
        case 'gall':
        case 'gaul':
            tribeEmbed = new EmbedBuilder()
                .setColor(tribeData.color)
                .setTitle(`${tribeData.emoji} ${tribeData.name}`)
                .addFields(
                    { name: '💪 Erősségek', value: '• Gyors kereskedő\n• Kiváló védőfal\n• Jó felderítés\n• Csapdák', inline: true },
                    { name: '⚖️ Gyengeségek', value: '• Drága egységek\n• Lassabb támadó egységek\n• Kisebb támadóerő', inline: true },
                    { name: '🏆 Különlegességek', value: '• Csapdák építhetők\n• Legjobb kereskedő (24 mező/óra)\n• Erős védőegységek\n• Főnök (befolyás)', inline: false },
                    { name: '⚔️ Fő egységek', value: '**Védelem:** Phalanx, Druida lovas\n**Támadás:** Kardos, Theutat Villám\n**Felderítés:** Felderítő', inline: false }
                );
            break;
        case 'egyiptomi':
        case 'egyptian':
            tribeEmbed = new EmbedBuilder()
                .setColor(tribeData.color)
                .setTitle(`${tribeData.emoji} ${tribeData.name}`)
                .addFields(
                    { name: '💪 Erősségek', value: '• Gyors fejlődés\n• Olcsó egységek\n• Jó termelési bónuszok\n• Egyedi taktikai lehetőségek', inline: true },
                    { name: '⚖️ Gyengeségek', value: '• Gyengébb védelem\n• Közepes támadóerő\n• Lassú kereskedő', inline: true },
                    { name: '🏆 Különlegességek', value: '• Nagy lakóhely kapacitás\n• Gyors építkezés\n• Nomarch (befolyás)\n• Egyedi építmények', inline: false },
                    { name: '⚔️ Fő egységek', value: '**Védelem:** Kőris őr, Anhur őr\n**Támadás:** Khopesh harcos, Resheph fogathajtó\n**Felderítés:** Sopdu felfedező', inline: false }
                );
            break;
        case 'hun':
        case 'huns':
            tribeEmbed = new EmbedBuilder()
                .setColor(tribeData.color)
                .setTitle(`${tribeData.emoji} ${tribeData.name}`)
                .addFields(
                    { name: '💪 Erősségek', value: '• Gyors lovassági egységek\n• Jó raid képesség\n• Erős távolsági támadás\n• Gyors kereskedő', inline: true },
                    { name: '⚖️ Gyengeségek', value: '• Gyenge védelem\n• Drága infrastruktúra\n• Kisebb termelési bónuszok', inline: true },
                    { name: '🏆 Különlegességek', value: '• Nomád életmód előnyök\n• Erős lovasság\n• Kiválasztott (megsemmisítés)\n• Gyors kereskedő (20 mező/óra)', inline: false },
                    { name: '⚔️ Fő egységek', value: '**Védelem:** Zsoldos, Martalóc\n**Támadás:** Íjász, Sztyeppei lovas, Mesterlövész\n**Felderítés:** Figyelő', inline: false }
                );
            break;
    }

    await message.reply({ embeds: [tribeEmbed] });
}

async function handleReminderCommand(message, args) {
    const minutes = parseInt(args[0]);
    const reminderText = args.slice(1).join(' ');

    if (isNaN(minutes) || minutes <= 0 || !reminderText) {
        return message.reply('❌ Használat: `!emlékeztető [perc] [üzenet]`\nPélda: `!emlékeztető 30 Ellenőrizd a farmokat!`');
    }

    if (minutes > config.bot.maxReminderMinutes) {
        return message.reply(`❌ Maximum ${config.bot.maxReminderMinutes} perc (24 óra) állítható be!`);
    }

    const reminderEmbed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('⏰ Emlékeztető Beállítva')
        .addFields(
            { name: '⏱️ Idő', value: `${minutes} perc`, inline: true },
            { name: '📝 Üzenet', value: reminderText, inline: true },
            { name: '🔔 Értesítés', value: `<t:${Math.floor((Date.now() + minutes * 60000) / 1000)}:R>`, inline: false }
        )
        .setTimestamp();

    await message.reply({ embeds: [reminderEmbed] });

    // Időzítő beállítása
    setTimeout(async () => {
        const alertEmbed = new EmbedBuilder()
            .setColor('#FF4500')
            .setTitle('🔔 Emlékeztető!')
            .setDescription(`**${reminderText}**`)
            .addFields(
                { name: '👤 Beállította', value: `<@${message.author.id}>`, inline: true },
                { name: '⏰ Beállítva', value: `${minutes} perce`, inline: true }
            )
            .setTimestamp();

        await message.channel.send({ content: `<@${message.author.id}>`, embeds: [alertEmbed] });
    }, minutes * 60000);
}

module.exports = {
    handleTravianCommand,
    formatTime,
    calculateTravelTime,
    calculateResources
};
