import fs from 'fs';
import path from 'path';

const getLogFilePath = () => {
	const now = new Date();
	const year = now.getFullYear().toString();
	const month = (now.getMonth() + 1).toString().padStart(2, '0');
	const day = now.getDate().toString().padStart(2, '0');
	// Buat folder logs di dalam folder src: src/logs/<tahun>/<bulan>
	const logsDir = path.join(process.cwd(), 'src', 'logs', year, month);
	fs.mkdirSync(logsDir, { recursive: true });
	// Nama file: <tanggal>.log, misal "20.log"
	const logFileName = `${day}.log`;
	return path.join(logsDir, logFileName);
};

export const log = (message) => {
	const now = new Date();
	const timestamp = now.toISOString();
	const logMessage = `[${timestamp}] ${message}\n`;
	console.log(logMessage);
	const logFilePath = getLogFilePath();
	fs.appendFile(logFilePath, logMessage, (err) => {
		if (err) console.error('Error writing log file:', err);
	});
};

export const error = (message) => {
	const now = new Date();
	const timestamp = now.toISOString();
	const logMessage = `[${timestamp}] ERROR: ${message}\n`;
	console.error(logMessage);
	const logFilePath = getLogFilePath();
	fs.appendFile(logFilePath, logMessage, (err) => {
		if (err) console.error('Error writing log file:', err);
	});
};
