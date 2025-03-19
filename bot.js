// bot.js
import 'dotenv/config';
import { log } from './src/logger.js';
import { saveLastActiveTime, getLastActiveTime } from './src/utils.js';
import bot from './src/botInstance.js';

// Pastikan variabel global untuk media groups tersedia
if (!global.mediaGroups) global.mediaGroups = {};

saveLastActiveTime();

// Impor modul command & handler (setiap file akan langsung mendaftarkan handler ke bot)
import './src/commands/start.js';
import './src/commands/kata_terlarang.js';
import './src/commands/link.js';
import './src/commands/help.js';
import './src/commands/ketentuan.js';
import './src/handlers/messageHandler.js';

// Shutdown handler
function handleShutdown() {
	log('Bot sedang dimatikan...');
	saveLastActiveTime();
	bot.stop('SIGTERM');
}
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

// Launch bot
bot.launch().then(() => {
	const startTime = new Date().toISOString();
	const lastActive = new Date(getLastActiveTime()).toISOString();
	log(`Bot berjalan dalam mode: ${process.env.IS_TESTING ? 'PRIVATE' : 'PUBLIC'}`);
	log(`Waktu sekarang: ${startTime}`);
	log(`Timestamp terakhir aktif: ${lastActive}`);
	log(`Bot siap menerima pesan. Pesan yang dikirim sebelum ${lastActive} akan diabaikan.`);
});
