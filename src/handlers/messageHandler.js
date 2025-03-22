import bot from '../botInstance.js';
import { Markup } from 'telegraf';
import { checkMembership, getLastActiveTime, containsBlacklistedWord, extractLinks, determineTargetChannel, sendToChannel, getChannelHandle } from '../utils.js';
import { log, error } from '../logger.js';
import { whitelistedLinks } from '../whitelist_link.js';

const GROUP_ID = process.env.GROUP_ID;

const isTesting = false;
const allowedUsers = [339890451];

bot.on(['text', 'photo'], async (ctx) => {
	const userId = ctx.from.id;
	const username = ctx.from.username || 'Tidak ada username';
	const firstName = ctx.from.first_name || '';
	const lastName = ctx.from.last_name || '';
	const fullName = `${firstName} ${lastName}`.trim();
	const userProfileLink = username ? `https://t.me/${username}` : `tg://user?id=${userId}`;
	const messageTimestamp = ctx.message.date * 1000; // Konversi ke ms
	const lastActiveTime = getLastActiveTime();

	if (ctx.chat.type !== 'private') return;

	if (messageTimestamp < lastActiveTime) {
		log(`Melewati pesan dari @${username} (${userId}) karena dikirim saat bot mati`);
		return ctx.reply('ℹ️ Pesan ini dikirim saat bot sedang offline. Silakan kirim ulang pesan Anda.');
	}

	if (isTesting && !allowedUsers.includes(userId)) {
		log(`Akses ditolak untuk user ${userId} (@${username})`);
		return ctx.reply('🚧 Bot sedang dalam perbaikan. Silahkan kembali lagi nanti ketika sudah selesai perbaikan.');
	}

	const { isGroupMember, isChannelMember } = await checkMembership(bot, userId);
	if (!isTesting && (!isGroupMember || !isChannelMember)) {
		log(`User ${userId} (@${username}) belum join grup/channel`);
		return ctx.reply(
			'❌ Anda harus bergabung di grup dan channel sebelum menggunakan bot ini.\n\nKlik tombol di bawah untuk bergabung:',
			Markup.inlineKeyboard([[Markup.button.url('📢 Gabung Channel', `https://t.me/partyml_promote`), Markup.button.url('💬 Gabung Grup', `https://t.me/party_ml`)]])
		);
	}

	try {
		let messageText = ctx.message.text || '';
		let photos = ctx.message.photo ? [ctx.message.photo.slice(-1)[0]] : [];
		let caption = ctx.message.caption || messageText || '';

		// Cek keberadaan salah satu hashtag (case‑insensitive)
		const lowerCaption = caption.toLowerCase();
		if (!lowerCaption.includes('#carimember') && !lowerCaption.includes('#cariparty') && !lowerCaption.includes('#event')) {
			return ctx.reply('❌ Pesan harus mengandung hashtag #carimember, #cariparty, atau #event untuk dikirimkan.\n\nContoh: #cariparty Mabar yuk guys!');
		}
		// Cek blacklist
		if (containsBlacklistedWord(caption)) {
			log(`Pesan dari @${username} mengandung kata-kata terlarang: ${caption}`);
			return ctx.reply('❌ Pesan Anda mengandung kata-kata terlarang dan tidak dapat promote.');
		}
		// Cek link (whitelist)
		const linksInMessage = extractLinks(caption);
		for (const link of linksInMessage) {
			if (!whitelistedLinks.some((prefix) => link.startsWith(prefix))) {
				return ctx.reply('❌ Pesan Anda mengandung link yang tidak diperbolehkan. Silahkan cek /link untuk daftar yang diperbolehkan');
			}
		}

		// Tentukan channel tujuan secara eksklusif
		// Jika pesan mengandung #event atau #carimember, maka targetChannel bukan CHANNEL_ID
		const targetChannel = determineTargetChannel(caption);
		console.log(`Determined target channel: ${targetChannel}`);

		// Add the chat verification:
		try {
			// Try to get chat info
			const chatInfo = await bot.telegram.getChat(targetChannel);
			console.log(`Chat exists: ${chatInfo.title}`);
		} catch (e) {
			console.error(`Cannot access chat ${targetChannel}: ${e.message}`);
			return ctx.reply('❌ Bot tidak dapat mengakses channel tujuan. Silakan hubungi admin.');
		}

		// Variabel untuk menyimpan ID pesan dari grup sebagai acuan URL komentar
		let groupMsgId;

		// Jika pesan berupa album (media_group)
		if (ctx.message.media_group_id) {
			const mediaGroup = ctx.message.media_group_id;
			if (!global.mediaGroups[mediaGroup]) {
				global.mediaGroups[mediaGroup] = {
					photos: [],
					caption,
					timestamp: messageTimestamp,
					userInfo: { userId, username, fullName },
				};
			}
			global.mediaGroups[mediaGroup].photos.push(...photos);
			setTimeout(async () => {
				const mediaData = global.mediaGroups[mediaGroup];
				if (mediaData) {
					if (mediaData.timestamp < lastActiveTime) {
						log(`Melewati media group dari @${mediaData.userInfo.username} karena dikirim saat bot mati`);
						delete global.mediaGroups[mediaGroup];
						return;
					}
					if (mediaData.photos.length > 1) {
						ctx.reply('❌ Hanya satu gambar yang diperbolehkan. Silakan kirim ulang dengan satu gambar saja.');
						delete global.mediaGroups[mediaGroup];
						return;
					}
					const mediaPayloadGroup = mediaData.photos.map((photo, index) => ({
						type: 'photo',
						media: photo.file_id,
						caption: index === 0 ? mediaData.caption : undefined,
					}));
					// Selalu kirim pesan ke GROUP_ID (untuk referensi komentar)
					const groupMessages = await ctx.telegram.sendMediaGroup(GROUP_ID, mediaPayloadGroup);
					groupMsgId = groupMessages[0].message_id;
					// Kirim ke channel tujuan (misalnya CHANNEL_ID_EVENT atau CHANNEL_ID_CARISQUAD)
					await sendToChannel(ctx, targetChannel, mediaData.caption, groupMsgId);

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

		// Log detail pesan
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

		// Menambahkan prefix sudah diteruskan ke: nama channel
		const channelHandle = getChannelHandle(caption);
		console.log(`Channel handle yang ditentukan: ${channelHandle}`);
		const groupCaption = `${caption}\n\nPesan diteruskan dari channel: ${channelHandle}`;

		// Pengiriman pesan teks atau foto tunggal
		if (!photos.length) {
			const groupMessage = await ctx.telegram.sendMessage(GROUP_ID, groupCaption);
			groupMsgId = groupMessage.message_id;
			await sendToChannel(ctx, targetChannel, caption, groupMsgId);
		} else {
			// Payload untuk grup: gunakan groupCaption (caption + prefix)
			const mediaPayloadGroup = photos.map((photo, index) => ({
				type: 'photo',
				media: photo.file_id,
				caption: index === 0 ? groupCaption : undefined,
			}));

			// Payload untuk channel: gunakan caption asli
			const mediaPayloadChannel = photos.map((photo, index) => ({
				type: 'photo',
				media: photo.file_id,
				caption: index === 0 ? caption : undefined,
			}));

			const groupMessages = await ctx.telegram.sendMediaGroup(GROUP_ID, mediaPayloadGroup);
			groupMsgId = groupMessages[0].message_id;
			const channelMessages = await ctx.telegram.sendMediaGroup(targetChannel, mediaPayloadChannel);
			const groupNumericId = GROUP_ID.replace('-100', '');
			const commentUrl = `https://t.me/c/${groupNumericId}/${groupMsgId}?thread=${groupMsgId}`;
			await ctx.telegram.editMessageReplyMarkup(targetChannel, channelMessages[0].message_id, null, {
				inline_keyboard: [[{ text: 'Go to message', url: commentUrl }]],
			});
		}

		log(`Pesan berhasil dikirim ke grup & channel dari @${username}`);
		ctx.reply('✅ Pesan berhasil dikirim!');
	} catch (e) {
		error(`ERROR untuk @${username} (${userId}): ${e.message}`);
		ctx.reply('❌ Terjadi kesalahan, coba lagi!');
	}
});
