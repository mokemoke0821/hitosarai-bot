import { Client } from 'discord.js';
import { logger } from './utils/logger';

/**
 * エラー処理ユーティリティ
 */
class ErrorHandler {
  private static client: Client | null = null;

  /**
   * クライアントをセットする
   * @param client Discord.jsクライアント
   */
  static setClient(client: Client): void {
    ErrorHandler.client = client;
  }

  /**
   * エラーを処理する
   * @param error エラーオブジェクト
   * @param source エラーの発生源
   */
  static handleError(error: Error, source: string): void {
    // エラーをログに記録
    logger.error(`[${source}] エラーが発生しました:`, error);
    
    // エラーを特定のチャンネルに通知する場合
    try {
      if (ErrorHandler.client && process.env.ERROR_CHANNEL_ID) {
        const channel = ErrorHandler.client.channels.cache.get(process.env.ERROR_CHANNEL_ID);
        if (channel && channel.isTextBased()) {
          channel.send(`⚠️ **エラー発生:** \`${source}\` - ${error.message}`).catch(err => {
            logger.error('エラーチャンネルへの送信に失敗しました:', err);
          });
        }
      }
    } catch (e) {
      logger.error('エラー通知処理中に例外が発生しました:', e);
    }
  }
}

export default ErrorHandler;
