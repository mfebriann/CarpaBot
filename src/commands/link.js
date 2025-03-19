// src/commands/link.js
import bot from '../botInstance.js';
import { whitelistedLinks } from '../whitelist_link.js';

bot.command('link', (ctx) => {
	let response = 'Ini adalah daftar link yang diperbolehkan pada bot:\n\n';
	whitelistedLinks.forEach((link) => {
		response += `- ${link}\n`;
	});
	ctx.reply(response);
});
