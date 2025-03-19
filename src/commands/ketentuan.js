// src/commands/ketentuan.js
import bot from '../botInstance.js';
import { terms } from '../terms.js';

bot.command('ketentuan', (ctx) => {
	let response = 'Ini adalah daftar ketentuan dalam menggunakan bot ini:\n\n';
	terms.forEach((term) => {
		response += `- ${term}\n`;
	});
	ctx.reply(response);
});
