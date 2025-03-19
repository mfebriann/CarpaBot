import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';
import { checkMembership, saveLastActiveTime, getLastActiveTime, containsBlacklistedWord } from './src/utils.js';
import { log, error } from './src/logger.js';
import { blacklistedWords } from './src/words_blacklist.js';

saveLastActiveTime();

const bot = new Telegraf(process.env.BOT_TOKEN);

const GROUP_ID = process.env.GROUP_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;

// Atur mode: true = Private (hanya ID tertentu), false = Public (semua bisa akses)
const isTesting = true;

// Daftar user ID yang diperbolehkan saat mode private
const allowedUsers = [339890451]; // Ganti dengan ID yang diperbolehkan

// Media groups temporary storage
if (!global.mediaGroups) global.mediaGroups = {};

bot.start((ctx) => {
	return ctx.reply('Halo 👋, perkenalkan saya aku Carpa Bot. Bot yang akan meneruskan pesan kamu ke channel dan grup kami');
});

// Handler untuk /kata_terlarang
bot.command('kata_terlarang', (ctx) => {
	let response = 'Ini adalah daftar kata terlarang yang tidak dapat digunakan pada bot ini:\n\n';
	blacklistedWords.forEach((word) => {
		response += `- ${word}\n`;
	});
	ctx.reply(response);
});

// Handler untuk /help
bot.command('help', (ctx) => {
	const helpMessage = `Berikut adalah bantuan untuk menggunakan bot ini:
Klik tombol "Start" untuk memulai.
Klik tombol "Kata Terlarang" untuk melihat daftar kata terlarang.`;
	ctx.reply(helpMessage, Markup.inlineKeyboard([[Markup.button.callback('Start', 'help_start')], [Markup.button.callback('Kata Terlarang', 'help_kata_terlarang')]]));
});

// Action untuk tombol "Start"
bot.action('help_start', (ctx) => {
	// Jawaban untuk callback query agar tombol tidak terus berputar loading
	ctx.answerCbQuery();
	// Anda dapat mengarahkan pengguna untuk mengetik perintah /start secara manual,
	// atau memberikan info tambahan terkait perintah tersebut.
	ctx.reply('Untuk memulai, silakan ketik /start di chat.');
});

// Action untuk tombol "Kata Terlarang"
bot.action('help_kata_terlarang', (ctx) => {
	ctx.answerCbQuery();
	let response = 'Ini adalah daftar kata terlarang yang tidak dapat digunakan pada bot ini:\n\n';
	blacklistedWords.forEach((word) => {
		response += `- ${word}\n`;
	});
	ctx.reply(response);
});

bot.on(['text', 'photo'], async (ctx) => {
	const userId = ctx.from.id;
	const username = ctx.from.username || 'Tidak ada username';
	const firstName = ctx.from.first_name || '';
	const lastName = ctx.from.last_name || '';
	const fullName = `${firstName} ${lastName}`.trim();
	const userProfileLink = username ? `https://t.me/${username}` : `tg://user?id=${userId}`;
	const messageTimestamp = ctx.message.date * 1000; // Konversi timestamp Telegram ke ms

	// Cek apakah pesan dikirim saat bot mati
	const lastActiveTime = getLastActiveTime();
	if (messageTimestamp < lastActiveTime) {
		log(`Melewati pesan dari @${username} (${userId}) karena dikirim saat bot mati`);
		return ctx.reply('ℹ️ Pesan ini dikirim saat bot sedang offline. Silakan kirim ulang pesan Anda.');
	}

	// Cek apakah pesan dikirim dari chat pribadi (bukan grup)
	if (ctx.chat.type !== 'private') {
		return;
	}

	// === 🔹 Mode Private: Batasi ke user tertentu ===
	if (isTesting && !allowedUsers.includes(userId)) {
		log(`Akses ditolak untuk user ${userId} (@${username})`);
		return ctx.reply('🚧 Bot sedang dalam perbaikan. Silahkan kembali lagi nanti ketika sudah selesai perbaikan.');
	}

	// === 🔹 Cek Membership Grup dan Channel ===
	const { isGroupMember, isChannelMember } = await checkMembership(bot, userId, GROUP_ID, CHANNEL_ID);
	if (!isTesting && (!isGroupMember || !isChannelMember)) {
		log(`User ${userId} (@${username}) belum join grup/channel`);
		return ctx.reply(
			'❌ Anda harus bergabung di grup dan channel sebelum menggunakan bot ini.\n\nKlik tombol di bawah untuk bergabung:',
			Markup.inlineKeyboard([[Markup.button.url('📢 Gabung Channel', `https://t.me/promote_cariparty`), Markup.button.url('💬 Gabung Grup', `https://t.me/party_ml`)]])
		);
	}

	try {
		let messageText = ctx.message.text || '';
		let photos = ctx.message.photo ? [ctx.message.photo.slice(-1)[0]] : [];
		let caption = ctx.message.caption || messageText || '';

		// Cek apakah caption mengandung kata-kata terlarang (blacklist)
		if (containsBlacklistedWord(caption)) {
			log(`Pesan dari @${username} mengandung kata-kata terlarang: ${caption}`);
			return ctx.reply('❌ Pesan Anda mengandung kata-kata terlarang dan tidak dapat promote.');
		}

		// --- Jika pesan merupakan album (media_group_id) ---
		if (ctx.message.media_group_id) {
			const mediaGroup = ctx.message.media_group_id;

			if (!global.mediaGroups[mediaGroup]) {
				global.mediaGroups[mediaGroup] = {
					photos: [],
					caption: caption,
					timestamp: messageTimestamp,
					userInfo: { userId, username, fullName },
				};
			}
			global.mediaGroups[mediaGroup].photos.push(...photos);

			// Tunggu beberapa saat agar semua pesan dalam group terkumpul
			setTimeout(async () => {
				const mediaData = global.mediaGroups[mediaGroup];
				if (mediaData) {
					if (mediaData.timestamp < lastActiveTime) {
						log(`Melewati media group dari @${mediaData.userInfo.username} karena dikirim saat bot mati`);
						delete global.mediaGroups[mediaGroup];
						return;
					}

					// Jika terdapat lebih dari satu gambar dan hanya satu gambar yang diperbolehkan
					if (mediaData.photos.length > 1) {
						ctx.reply('❌ Hanya satu gambar yang diperbolehkan. Silakan kirim ulang dengan satu gambar saja.');
						delete global.mediaGroups[mediaGroup];
						return;
					}

					// Payload untuk grup: caption ditambahkan informasi pengirim
					const mediaPayloadGroup = mediaData.photos.map((photo, index) => ({
						type: 'photo',
						media: photo.file_id,
						caption: index === 0 ? `${mediaData.caption}\n\nPesan dari: @${mediaData.userInfo.username}` : undefined,
					}));

					// Payload untuk channel: caption sesuai aslinya
					const mediaPayloadChannel = mediaData.photos.map((photo, index) => ({
						type: 'photo',
						media: photo.file_id,
						caption: index === 0 ? mediaData.caption : undefined,
					}));

					const groupMessages = await ctx.telegram.sendMediaGroup(GROUP_ID, mediaPayloadGroup);
					const channelMessages = await ctx.telegram.sendMediaGroup(CHANNEL_ID, mediaPayloadChannel);

					const groupNumericId = GROUP_ID.replace('-100', '');
					const commentUrl = `https://t.me/c/${groupNumericId}/${groupMessages[0].message_id}?thread=${groupMessages[0].message_id}`;

					await ctx.telegram.editMessageReplyMarkup(CHANNEL_ID, channelMessages[0].message_id, null, {
						inline_keyboard: [[{ text: 'Komentar', url: commentUrl }]],
					});
					log(`Media Group berhasil dikirim ke grup & channel dari @${mediaData.userInfo.username}`);

					try {
						await bot.telegram.sendMessage(mediaData.userInfo.userId, '✅ Media group berhasil dikirim!');
					} catch (e) {
						error(`Gagal mengirim konfirmasi ke @${mediaData.userInfo.username}: ${e.message}`);
					}
					delete global.mediaGroups[mediaGroup];
				}
			}, 1000);

			return;
		}

		// === 🔹 Log detail pengirim ===
		log(`===== NEW MESSAGE =====`);
		log(`Username: @${username}`);
		log(`Nama: ${fullName}`);
		log(`ID: ${userId}`);
		log(`Profile Link: ${userProfileLink}`);

		if (!photos.length) {
			log(`Pesan: ${caption}`);
		} else {
			log(`Foto Diterima!`);
			photos.forEach((photo, index) => {
				log(`Foto ${index + 1}: File ID: ${photo.file_id}`);
				log(`Resolusi: ${photo.width}x${photo.height}`);
			});
			log(`Caption: ${caption}`);
		}
		log(`======================`);

		if (!photos.length) {
			// === 🔹 Kirim pesan teks ===
			// Untuk grup, tambahkan informasi pengirim ke caption
			const groupCaption = `${caption}\n\nPesan dari: @${username}`;
			const groupMessage = await ctx.telegram.sendMessage(GROUP_ID, groupCaption);
			const sentMessage = await ctx.telegram.sendMessage(CHANNEL_ID, caption, { parse_mode: 'Markdown' });

			const groupNumericId = GROUP_ID.replace('-100', '');
			const commentUrl = `https://t.me/c/${groupNumericId}/${groupMessage.message_id}?thread=${groupMessage.message_id}`;

			await ctx.telegram.editMessageReplyMarkup(CHANNEL_ID, sentMessage.message_id, null, {
				inline_keyboard: [[{ text: 'Komentar', url: commentUrl }]],
			});
			log(`Pesan teks berhasil dikirim ke grup & channel dari @${username}`);
		} else {
			// === 🔹 Kirim foto sebagai Media Group ===
			// Untuk grup: caption diubah dengan tambahan informasi pengirim
			const mediaPayloadGroup = photos.map((photo, index) => ({
				type: 'photo',
				media: photo.file_id,
				caption: index === 0 ? `${caption}\n\nPesan dari: @${username}` : undefined,
			}));

			// Untuk channel: caption tetap sesuai aslinya
			const mediaPayloadChannel = photos.map((photo, index) => ({
				type: 'photo',
				media: photo.file_id,
				caption: index === 0 ? caption : undefined,
			}));

			const groupMessages = await ctx.telegram.sendMediaGroup(GROUP_ID, mediaPayloadGroup);
			const channelMessages = await ctx.telegram.sendMediaGroup(CHANNEL_ID, mediaPayloadChannel);

			const groupNumericId = GROUP_ID.replace('-100', '');
			const commentUrl = `https://t.me/c/${groupNumericId}/${groupMessages[0].message_id}?thread=${groupMessages[0].message_id}`;

			await ctx.telegram.editMessageReplyMarkup(CHANNEL_ID, channelMessages[0].message_id, null, {
				inline_keyboard: [[{ text: 'Komentar', url: commentUrl }]],
			});
			log(`Media Group berhasil dikirim ke grup & channel dari @${username}`);
		}

		ctx.reply('✅ Pesan berhasil dikirim!');
	} catch (e) {
		error(`ERROR untuk @${username} (${userId}): ${e.message}`);
		ctx.reply('❌ Terjadi kesalahan, coba lagi!');
	}
});

// Fungsi untuk menangani shutdown dengan baik
function handleShutdown() {
	log('Bot sedang dimatikan...');
	saveLastActiveTime();
	bot.stop('SIGTERM');
}

// Tangani signal shutdown
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

// Jalankan bot
bot.launch().then(() => {
	const startTime = new Date().toISOString();
	const lastActive = new Date(getLastActiveTime()).toISOString();
	log(`Bot berjalan dalam mode: ${isTesting ? 'PRIVATE' : 'PUBLIC'}`);
	log(`Waktu sekarang: ${startTime}`);
	log(`Timestamp terakhir aktif: ${lastActive}`);
	log(`Bot siap menerima pesan. Pesan yang dikirim sebelum ${lastActive} akan diabaikan.`);
});
