import fs from 'fs';
import path from 'path';
import { format, transports, createLogger } from 'winston';

// Define log directory and file
const logDir = path.join(process.cwd(), 'logs');
const logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);

// Log environment mode
if (process.env.NODE_ENV !== 'production') {
    console.log('Logger initialized in development mode');
    // Ensure log directory exists only in non-production
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
} else {
    console.log('Logger initialized in production mode');
}

// Create Winston logger
const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.json()
    ),
    transports: [
        ...(process.env.NODE_ENV !== 'production'
            ? [new transports.File({ filename: logFile })]
            : [new transports.Console()])
    ]
});

export default logger;