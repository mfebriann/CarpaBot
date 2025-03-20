// src/handlers/messageHandler.js
import bot from '../botInstance.js';
import { Markup } from 'telegraf';
import { checkMembership, saveLastActiveTime, getLastActiveTime, containsBlacklistedWord, extractLinks } from '../utils.js';
import { log, error } from '../logger.js';
import { whitelistedLinks } from '../whitelist_link.js';

const GROUP_ID = process.env.GROUP_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
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

		// Pengecekan prefix: harus mengandung #carimember atau #cariparty
		if (!caption.includes('#carimember') && !caption.includes('#cariparty')) {
			return ctx.reply('❌ Pesan harus mengandung ada hashtag #carimember atau #cariparty untuk dikirimkan.\n\nContoh: #cariparty Mabar yuk guys!');
		}
		// Pengecekan blacklist
		if (containsBlacklistedWord(caption)) {
			log(`Pesan dari @${username} mengandung kata-kata terlarang: ${caption}`);
			return ctx.reply('❌ Pesan Anda mengandung kata-kata terlarang dan tidak dapat promote.');
		}
		// Pengecekan link (whitelist)
		const linksInMessage = extractLinks(caption);
		for (const link of linksInMessage) {
			if (!whitelistedLinks.some((prefix) => link.startsWith(prefix))) {
				return ctx.reply('❌ Pesan Anda mengandung link yang tidak diperbolehkan. Silahkan cek /link untuk daftar yang diperbolehkan');
			}
		}

		// Jika pesan berupa album (media_group_id)
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
						caption: index === 0 ? `${mediaData.caption}\n\nPesan dari: @${mediaData.userInfo.username}` : undefined,
					}));
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

		// Pengiriman pesan: teks atau media
		if (!photos.length) {
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
			const mediaPayloadGroup = photos.map((photo, index) => ({
				type: 'photo',
				media: photo.file_id,
				caption: index === 0 ? `${caption}\n\nPesan dari: @${username}` : undefined,
			}));
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
