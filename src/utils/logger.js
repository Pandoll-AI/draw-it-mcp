import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.join(__dirname, '..', '..', 'logs');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (stack) {
      msg += `\n${stack}`;
    }
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

const consoleTransport = new winston.transports.Console({
  level: 'debug',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({ level, message }) => `[${new Date().toLocaleTimeString()}] ${message}`)
  )
});

const fileRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'mcp-server-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  level: 'debug',
  format: logFormat
});

const errorFileRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: logFormat
});

const mcpRequestResponseTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'mcp-requests-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '7d',
  level: 'info',
  format: logFormat
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    consoleTransport,
    fileRotateTransport,
    errorFileRotateTransport
  ]
});

export const mcpLogger = winston.createLogger({
  level: 'info',
  transports: [mcpRequestResponseTransport]
});

// Simple process logger for terminal (using stderr to avoid interfering with MCP stdio)
export const processLogger = {
  info: (action, details = '') => {
    const time = new Date().toLocaleTimeString();
    const msg = details ? `[${time}] ${action}: ${details}` : `[${time}] ${action}`;
    console.error(msg);
  }
};

export default logger;