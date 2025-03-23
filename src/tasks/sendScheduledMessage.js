// src/tasks/scheduledMessage.js
export const sendScheduledMessage = (bot, chatId, intervalMinutes = 20) => {
	const message = 'Jika kalian ingin mencari party atau member squad dan melihat event yang sedang diadakan di grup ini. Kalian bisa menggunakan bot ini ya, atau @CariPartyBot';

	const intervalMs = intervalMinutes * 60 * 1000;
	const logIntervalMs = 5 * 60 * 1000; // 5 menit
	let remainingMinutes = intervalMinutes;

	const sendMessage = async () => {
		try {
			await bot.telegram.sendMessage(chatId, message);
			console.log(`[${new Date().toISOString()}] ✅ Pesan terjadwal berhasil dikirim.`);
		} catch (error) {
			console.error(`Gagal mengirim pesan terjadwal: ${error.message}`);
		}
	};

	// Kirim pesan pertama kali setelah bot aktif
	sendMessage();

	const logInterval = setInterval(() => {
		remainingMinutes -= 5;
		if (remainingMinutes > 0) {
			console.log(`⏳ [${new Date().toISOString()}] Sisa waktu ${remainingMinutes} menit sebelum pesan dikirim.`);
		}
	}, logIntervalMs);

	const messageInterval = setInterval(() => {
		remainingMinutes = intervalMinutes;
		sendMessage();
	}, intervalMs);

	return { logInterval, messageInterval };
};
