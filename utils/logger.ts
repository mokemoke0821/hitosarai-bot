import fs from 'fs';
import path from 'path';
import { TextChannel } from 'discord.js';
import { config } from '../config/config';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// 古いログファイルを削除する（30日以上前のログ）
const cleanupOldLogs = () => {
  try {
    const files = fs.readdirSync(logsDir);
    const now = new Date().getTime();
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    
    for (const file of files) {
      const filePath = path.join(logsDir, file);
      const stat = fs.statSync(filePath);
      
      // ファイルの更新日時が30日以上前のものを削除
      if (now - stat.mtime.getTime() > thirtyDaysInMs) {
        fs.unlinkSync(filePath);
        console.log(`古いログファイルを削除しました: ${file}`);
      }
    }
  } catch (error) {
    console.error('ログファイルのクリーンアップに失敗しました:', error);
  }
};

// 起動時に古いログをクリーンアップ
cleanupOldLogs();

// Log file path
const logFilePath = path.join(logsDir, `bot-${new Date().toISOString().split('T')[0]}.log`);

/**
 * Logger utility for console and file logging
 */
export const logger = {
  /**
   * Log info message
   * @param message - Message to log
   * @param args - Additional arguments
   */
  info: (message: string, ...args: any[]) => {
    const logMessage = `[INFO] ${new Date().toISOString()} - ${message}`;
    console.log(logMessage, ...args);
    appendToLogFile(logMessage, args);
  },

  /**
   * Log warning message
   * @param message - Message to log
   * @param args - Additional arguments
   */
  warn: (message: string, ...args: any[]) => {
    const logMessage = `[WARN] ${new Date().toISOString()} - ${message}`;
    console.warn(logMessage, ...args);
    appendToLogFile(logMessage, args);
  },

  /**
   * Log error message
   * @param message - Message to log
   * @param args - Additional arguments
   */
  error: (message: string, ...args: any[]) => {
    const logMessage = `[ERROR] ${new Date().toISOString()} - ${message}`;
    console.error(logMessage, ...args);
    appendToLogFile(logMessage, args);
  },

  /**
   * Log voice channel movement
   * @param message - Message to log
   * @param logChannel - Discord text channel to log to (optional)
   */
  logVoiceMovement: async (message: string, logChannel?: TextChannel) => {
    const logMessage = `[VOICE] ${new Date().toISOString()} - ${message}`;
    console.log(logMessage);
    appendToLogFile(logMessage);

    // If log channel is provided, send message to it
    if (logChannel) {
      try {
        await logChannel.send(message);
      } catch (error) {
        console.error(`Failed to send log to channel: ${error}`);
      }
    }
  }
};

/**
 * Append message to log file
 * @param message - Message to append
 * @param args - Additional arguments
 */
function appendToLogFile(message: string, args: any[] = []) {
  try {
    const argsStr = args.length > 0 ? ` ${args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : arg
    ).join(' ')}` : '';
    
    fs.appendFileSync(logFilePath, `${message}${argsStr}\n`);
  } catch (error) {
    console.error(`Failed to write to log file: ${error}`);
  }
}
