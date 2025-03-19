// src/commands/help.js
import bot from '../botInstance.js';
import { Markup } from 'telegraf';
import { blacklistedWords } from '../words_blacklist.js';
import { terms } from '../terms.js';
import { whitelistedLinks } from '../whitelist_link.js';

bot.command('help', (ctx) => {
	const helpMessage = `Berikut adalah bantuan untuk menggunakan bot ini:`;
	ctx.reply(
		helpMessage,
		Markup.inlineKeyboard([
			[Markup.button.callback('Start', 'help_start')],
			[Markup.button.callback('Kata Terlarang', 'help_kata_terlarang')],
			[Markup.button.callback('Ketentuan', 'help_ketentuan')],
			[Markup.button.callback('Link', 'help_link')],
		])
	);
});

bot.action('help_start', (ctx) => {
	ctx.answerCbQuery();
	ctx.reply('Untuk memulai, silakan ketik /start di chat.');
});

bot.action('help_kata_terlarang', (ctx) => {
	ctx.answerCbQuery();
	let response = 'Ini adalah daftar kata terlarang yang tidak dapat digunakan pada bot ini:\n\n';
	blacklistedWords.forEach((word) => {
		response += `- ${word}\n`;
	});
	ctx.reply(response);
});

bot.action('help_ketentuan', (ctx) => {
	let response = 'Ini adalah daftar ketentuan dalam menggunakan bot ini:\n\n';
	terms.forEach((term) => {
		response += `- ${term}\n`;
	});
	ctx.reply(response);
});

bot.action('help_link', (ctx) => {
	let response = 'Ini adalah daftar link yang diperbolehkan pada bot:\n\n';
	whitelistedLinks.forEach((link) => {
		response += `- ${link}\n`;
	});
	ctx.reply(response);
});
