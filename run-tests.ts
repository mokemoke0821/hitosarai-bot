#!/usr/bin/env node

/**
 * Discord Voice Mover Bot テストランナー
 * 
 * このスクリプトは、Botの各種テストを実行するためのものです。
 */

import { logger } from '../utils/logger';
import { runTests as runConfigTests } from './config-test';
import { runTests as runCommandTests } from './command-test';

async function runAllTests() {
  logger.info('===== Discord Voice Mover Bot テストランナー =====');
  
  // 設定テスト
  logger.info('\n----- 設定テスト -----');
  const configTestResult = await runConfigTests();
  if (!configTestResult) {
    logger.error('設定テストに失敗しました。以降のテストをスキップします。');
    return false;
  }
  
  // コマンドテスト
  logger.info('\n----- コマンドテスト -----');
  const commandTestResult = await runCommandTests();
  if (!commandTestResult) {
    logger.error('コマンドテストに失敗しました。');
    return false;
  }
  
  logger.info('\n===== 全てのテストが正常に完了しました！ =====');
  return true;
}

// スクリプトが直接実行された場合にテストを実行
if (require.main === module) {
  runAllTests()
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

export { runAllTests };
