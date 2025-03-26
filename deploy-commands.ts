import { REST, Routes } from 'discord.js';
import { config } from './config/config';
import fs from 'fs';
import path from 'path';
import { logger } from './utils/logger';

// コマンドを登録する関数
async function deployCommands() {
  try {
    // 環境変数のチェック
    if (!config.token) {
      throw new Error('BOT_TOKENが設定されていません。.envファイルを確認してください。');
    }
    
    if (!process.env.CLIENT_ID) {
      throw new Error('CLIENT_IDが設定されていません。.envファイルを確認してください。');
    }

    // ギルド（サーバー）専用コマンドとして登録
    // config.guildIdが設定されている場合はそのサーバーに登録
    // それ以外の場合はグローバルコマンドとして登録
    let deploymentTarget;
    let targetType;
    
    if (config.guildId) {
      deploymentTarget = Routes.applicationGuildCommands(process.env.CLIENT_ID, config.guildId);
      targetType = `ギルド(${config.guildId})`;
      logger.info(`ギルド専用コマンドとして登録します (即時反映)`);
    } else {
      deploymentTarget = Routes.applicationCommands(process.env.CLIENT_ID);
      targetType = 'グローバル';
      logger.info('グローバルコマンドとして登録します（反映に最大1時間かかる場合があります）');
    }

    // コマンドファイルの読み込み
    const commands = [];
    const foldersPath = path.join(__dirname, 'commands');
    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
      const commandsPath = path.join(foldersPath, folder);
      const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));
      
      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
          commands.push(command.data.toJSON());
          logger.info(`コマンド ${command.data.name} を登録リストに追加しました`);
        } else {
          logger.warn(`${filePath} には必要な "data" または "execute" プロパティがありません`);
        }
      }
    }

    // RESTモジュールの準備
    const rest = new REST().setToken(config.token);

    // コマンドの登録
    logger.info(`${commands.length} 個のアプリケーションコマンドを登録しています...`);

    // コマンドの登録（ギルド固有またはグローバル）
    const data = await rest.put(
      deploymentTarget,
      { body: commands },
    );

    logger.info(`${(data as any).length} 個のアプリケーションコマンドを ${targetType} に正常に登録しました`);
    return true;
  } catch (error) {
    logger.error('コマンド登録中にエラーが発生しました:', error);
    return false;
  }
}

// スクリプトが直接実行された場合にコマンドを登録
if (require.main === module) {
  deployCommands()
    .then(success => {
      if (success) {
        logger.info('コマンド登録が完了しました');
        process.exit(0);
      } else {
        logger.error('コマンド登録に失敗しました');
        process.exit(1);
      }
    })
    .catch(error => {
      logger.error('予期せぬエラーが発生しました:', error);
      process.exit(1);
    });
}

export { deployCommands };