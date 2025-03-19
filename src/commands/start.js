// src/commands/start.js
import bot from '../botInstance.js';

bot.start((ctx) => {
	ctx.reply('Halo 👋, perkenalkan saya Carpa Bot. Bot yang akan meneruskan pesan kamu ke channel dan grup kami');
});
