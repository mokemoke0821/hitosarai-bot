import { Client } from 'discord.js';
import { config } from '../config/config';
import { logger } from '../utils/logger';

/**
 * テスト用のスクリプト
 * 
 * このファイルは、Botの基本的な機能をテストするためのものです。
 * 実際のDiscordサーバーに接続せずに、コードの構造や設定をチェックします。
 */

// 設定のバリデーション
function validateConfig() {
  logger.info('設定のバリデーションを開始します...');
  
  let isValid = true;
  
  // 必須項目のチェック
  if (!config.token) {
    logger.error('エラー: BOT_TOKENが設定されていません。.envファイルを確認してください。');
    isValid = false;
  } else {
    logger.info('✓ BOT_TOKENが設定されています');
  }
  
  if (!config.prefix) {
    logger.warn('警告: PREFIXが設定されていません。デフォルト値の "!" が使用されます。');
  } else {
    logger.info(`✓ コマンドプレフィックスが設定されています: ${config.prefix}`);
  }
  
  if (!config.guildId) {
    logger.warn('警告: GUILD_IDが設定されていません。開発中はギルド固有のコマンドが登録できません。');
  } else {
    logger.info(`✓ GUILD_IDが設定されています: ${config.guildId}`);
  }
  
  // クライアントオプションのチェック
  if (!config.clientOptions || !config.clientOptions.intents) {
    logger.error('エラー: クライアントオプションが正しく設定されていません。');
    isValid = false;
  } else {
    logger.info('✓ クライアントオプションが設定されています');
  }
  
  return isValid;
}

// コマンド定義のバリデーション
function validateCommands() {
  logger.info('コマンド定義のバリデーションを開始します...');
  
  // コマンドファイルの存在チェック
  try {
    const fs = require('fs');
    const path = require('path');
    
    const commandsPath = path.join(__dirname, '..', 'commands', 'voice');
    if (!fs.existsSync(commandsPath)) {
      logger.error('エラー: commands/voiceディレクトリが見つかりません。');
      return false;
    }
    
    const requiredCommands = ['moveAll.ts', 'moveFrom.ts', 'moveRole.ts'];
    let missingCommands = [];
    
    for (const cmd of requiredCommands) {
      if (!fs.existsSync(path.join(commandsPath, cmd))) {
        missingCommands.push(cmd);
      }
    }
    
    if (missingCommands.length > 0) {
      logger.error(`エラー: 以下のコマンドファイルが見つかりません: ${missingCommands.join(', ')}`);
      return false;
    }
    
    logger.info('✓ 必須コマンドファイルが見つかりました');
    return true;
  } catch (error) {
    logger.error('コマンド定義のチェック中にエラーが発生しました:', error);
    return false;
  }
}

// メイン実行関数
async function runTests() {
  logger.info('===== Discord Voice Mover Bot テスト =====');
  
  // 設定のバリデーション
  const configValid = validateConfig();
  if (!configValid) {
    logger.error('設定のバリデーションに失敗しました。テストを中止します。');
    return false;
  }
  logger.info('✓ 設定のバリデーションに成功しました');
  
  // コマンド定義のバリデーション
  const commandsValid = validateCommands();
  if (!commandsValid) {
    logger.error('コマンド定義のバリデーションに失敗しました。テストを中止します。');
    return false;
  }
  logger.info('✓ コマンド定義のバリデーションに成功しました');
  
  logger.info('全てのテストが正常に完了しました！');
  return true;
}

// スクリプトが直接実行された場合にテストを実行
if (require.main === module) {
  runTests()
    .then(success => {
      if (success) {
        logger.info('テストが成功しました');
        process.exit(0);
      } else {
        logger.error('テストに失敗しました');
        process.exit(1);
      }
    })
    .catch(error => {
      logger.error('テスト実行中にエラーが発生しました:', error);
      process.exit(1);
    });
}

export { runTests, validateConfig, validateCommands };
