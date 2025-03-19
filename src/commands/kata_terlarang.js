// src/commands/kata_terlarang.js
import bot from '../botInstance.js';
import { blacklistedWords } from '../words_blacklist.js';

bot.command('kata_terlarang', (ctx) => {
	let response = 'Ini adalah daftar kata terlarang yang tidak dapat digunakan pada bot:\n\n';
	blacklistedWords.forEach((word) => {
		response += `- ${word}\n`;
	});
	ctx.reply(response);
});
