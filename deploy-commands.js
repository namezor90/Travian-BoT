// deploy-commands.js - Slash parancsok telepítési script
const { REST, Routes } = require('discord.js');
const { commands } = require('./slash-commands');
require('dotenv').config();

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function deployCommands() {
    try {
        console.log(`🚀 Started refreshing ${commands.length} application (/) commands.`);

        // Guild-specific deployment (gyorsabb fejlesztéshez)
        if (process.env.GUILD_ID) {
            const data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands.map(command => command.toJSON()) },
            );
            console.log(`✅ Successfully reloaded ${data.length} guild application (/) commands.`);
        } else {
            // Global deployment (éles környezethez)
            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands.map(command => command.toJSON()) },
            );
            console.log(`✅ Successfully reloaded ${data.length} global application (/) commands.`);
        }

        console.log('📋 Telepített parancsok:');
        commands.forEach((command, index) => {
            console.log(`${index + 1}. /${command.name} - ${command.description}`);
        });

    } catch (error) {
        console.error('❌ Hiba a parancsok telepítésében:', error);
    }
}

// Script futtatása
if (require.main === module) {
    deployCommands();
}

module.exports = { deployCommands };
