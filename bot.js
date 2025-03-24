// bot.js
import 'dotenv/config';
import { log } from './src/logger.js';
import { saveLastActiveTime, getLastActiveTime } from './src/utils.js';
import bot from './src/botInstance.js';

// Pastikan variabel global untuk media groups tersedia
if (!global.mediaGroups) global.mediaGroups = {};

// Simpan waktu aktif terakhir saat start bot
saveLastActiveTime();

// Impor modul command & handler
import './src/commands/start.js';
import './src/commands/kata_terlarang.js';
import './src/commands/link.js';
import './src/commands/help.js';
import './src/commands/ketentuan.js';
import './src/handlers/messageHandler.js';
import { sendScheduledMessage } from './src/tasks/sendScheduledMessage.js';

// Start scheduled message setiap 20 menit dengan log tiap 5 menit
const { logInterval, messageInterval } = sendScheduledMessage(bot, process.env.GROUP_ID, 30);

// Handler shutdown yang bersih
function handleShutdown(signal) {
	log(`🛑 Bot sedang dimatikan (${signal})...`);
	saveLastActiveTime();
	clearInterval(logInterval);
	clearInterval(messageInterval);
	bot.stop(signal);
	process.exit(0);
}

process.once('SIGINT', () => handleShutdown('SIGINT'));
process.once('SIGTERM', () => handleShutdown('SIGTERM'));

// Launch bot
bot.launch().then(() => {
	const startTime = new Date().toISOString();
	const lastActive = new Date(getLastActiveTime()).toISOString();
	log(`🚀 Bot berjalan dalam mode: ${process.env.IS_TESTING ? 'PRIVATE' : 'PUBLIC'}`);
	log(`🕒 Waktu sekarang: ${startTime}`);
	log(`📅 Timestamp terakhir aktif: ${lastActive}`);
	log(`✅ Bot siap menerima pesan. Pesan sebelum ${lastActive} akan diabaikan.`);
});
