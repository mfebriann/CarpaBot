import fs from 'fs';
import path from 'path';
import { error } from './logger.js'; // Pastikan path sesuai struktur folder
import { blacklistedWords } from './words_blacklist.js';

const LAST_ACTIVE_FILE = path.join(process.cwd(), 'last_active.json');

const GROUP_ID = process.env.GROUP_ID;
const CHANNEL_ID = process.env.CHANNEL_ID; // Default untuk #cariparty
const CHANNEL_ID_CARISQUAD = process.env.CHANNEL_ID_CARISQUAD;
const CHANNEL_ID_EVENT = process.env.CHANNEL_ID_EVENT;

/**
 * Simpan waktu terakhir bot aktif
 */
export function saveLastActiveTime() {
	try {
		const timestamp = Date.now();
		fs.writeFileSync(LAST_ACTIVE_FILE, JSON.stringify({ lastActiveTime: timestamp }), 'utf8');
		return timestamp;
	} catch (e) {
		error('Error saat menyimpan waktu terakhir bot aktif: ' + e.message);
		return Date.now(); // Fallback ke waktu sekarang jika error
	}
}

/**
 * Ambil waktu terakhir bot aktif
 * @returns {number} Timestamp dalam format milliseconds
 */
export function getLastActiveTime() {
	try {
		if (fs.existsSync(LAST_ACTIVE_FILE)) {
			const data = fs.readFileSync(LAST_ACTIVE_FILE, 'utf8');
			const { lastActiveTime } = JSON.parse(data);
			return lastActiveTime;
		}
	} catch (e) {
		error('Error saat membaca waktu terakhir bot aktif: ' + e.message);
	}
	// Jika file tidak ada atau terjadi error, simpan waktu baru dan kembalikan
	return saveLastActiveTime();
}

/**
 * Cek keanggotaan pengguna di grup dan channel
 */
export const checkMembership = async (bot, userId) => {
	try {
		// Cek keanggotaan di Grup
		const groupMember = await bot.telegram.getChatMember(GROUP_ID, userId);
		const isGroupMember = ['member', 'administrator', 'creator'].includes(groupMember.status);

		// Cek keanggotaan di Channel
		const channelMember = await bot.telegram.getChatMember(CHANNEL_ID, userId);
		const isChannelMember = ['member', 'administrator', 'creator'].includes(channelMember.status);

		return { isGroupMember, isChannelMember };
	} catch (e) {
		error(`Error checking membership for ${userId}: ${e.message}`);
		return { isGroupMember: false, isChannelMember: false };
	}
};

export const containsBlacklistedWord = (text) => {
	if (!text) return false;
	const lowerText = text.toLowerCase();
	return blacklistedWords.some((word) => lowerText.includes(word.toLowerCase()));
};

// Fungsi untuk mengekstrak link dari teks
export const extractLinks = (text) => {
	const urlRegex = /(https?:\/\/[^\s]+)/g;
	return text.match(urlRegex) || [];
};

/**
 * Fungsi pembantu untuk mengirim pesan ke channel tertentu
 * dengan menambahkan tombol "Go to message" menggunakan ID pesan dari grup.
 */
export const sendToChannel = async (ctx, channelId, caption, groupMsgId, buttonText = 'Go to message') => {
	try {
		// Log the channel we're trying to send to
		console.log(`Attempting to send message to channelId: ${channelId}`);

		const sent = await ctx.telegram.sendMessage(channelId, caption, { parse_mode: 'Markdown' });
		const groupNumericId = GROUP_ID.replace('-100', '');
		const commentUrl = `https://t.me/c/${groupNumericId}/${groupMsgId}?thread=${groupMsgId}`;

		await ctx.telegram.editMessageReplyMarkup(channelId, sent.message_id, null, {
			inline_keyboard: [[{ text: buttonText, url: commentUrl }]],
		});
	} catch (e) {
		error(`Failed to send message to channel ${channelId}: ${e.message}`);
		throw e; // Re-throw to handle it in the caller
	}
};

/**
 * Fungsi untuk menentukan channel tujuan berdasarkan hashtag di caption.
 * Prioritas: jika ada #event, maka CHANNEL_ID_EVENT;
 * jika tidak ada #event tapi ada #carimember, maka CHANNEL_ID_CARISQUAD;
 * jika hanya ada #cariparty, maka channel default (CHANNEL_ID).
 */
export const determineTargetChannel = (caption) => {
	const lowerCaption = caption.toLowerCase();
	if (lowerCaption.includes('#event')) return CHANNEL_ID_EVENT;
	if (lowerCaption.includes('#carimember')) return CHANNEL_ID_CARISQUAD;
	// Default untuk #cariparty
	return CHANNEL_ID;
};
