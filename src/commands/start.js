// src/commands/start.js
import bot from '../botInstance.js';

bot.start((ctx) => {
	ctx.reply('Halo 👋, perkenalkan saya CarpaBot. Bot yang akan meneruskan pesan kamu ke channel dan grup kami');
});
