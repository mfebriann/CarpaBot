import fs from 'fs';
import path from 'path';
import { error } from './logger.js'; // Pastikan path sesuai struktur folder
import { blacklistedWords } from './words_blacklist.js';

const LAST_ACTIVE_FILE = path.join(process.cwd(), 'last_active.json');

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
export const checkMembership = async (bot, userId, GROUP_ID, CHANNEL_ID) => {
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
