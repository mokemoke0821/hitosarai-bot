import { Client, Events, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { config } from './config/config';
import { logger } from './utils/logger';
import fs from 'fs';
import path from 'path';
import ErrorHandler from './error-handler';

// レガシーコマンドハンドラー
import { handleMoveAll } from './legacy-commands/moveAll';
import { handleMoveFrom } from './legacy-commands/moveFrom';
import { handleMoveRole } from './legacy-commands/moveRole';

// クライアントにサービス用の型拡張
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, any>; // コマンドコレクションの型を追加
    services?: {
      voiceStateMonitor?: VoiceStateMonitor;
      scheduleService?: ScheduleService;
    }
  }
}

// Create a new client instance
const client = new Client(config.clientOptions);

// コマンドコレクションをクライアントに追加
client.commands = new Collection();

// コマンドをロードする関数
const loadCommands = () => {
  const foldersPath = path.join(__dirname, 'commands');
  const commandFolders = fs.readdirSync(foldersPath);

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));
    
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        logger.info(`コマンド ${command.data.name} を読み込みました`);
      } else {
        logger.warn(`${filePath} には必要な "data" または "execute" プロパティがありません`);
      }
    }
  }
};

// エラーハンドラの設定
ErrorHandler.setClient(client);

// グローバルな未処理エラーハンドラ
process.on('uncaughtException', (error) => {
  ErrorHandler.handleError(error, 'UncaughtException');
  logger.error('未処理の例外が発生しました:', error);
});

process.on('unhandledRejection', (reason: any, promise) => {
  ErrorHandler.handleError(reason instanceof Error ? reason : new Error(String(reason)), 'UnhandledRejection');
  logger.error('未処理のPromiseの拒否:', reason);
});

// Discordクライアントのエラーハンドリング
client.on('error', (error) => {
  ErrorHandler.handleError(error, 'DiscordClientError');
  logger.error('Discordクライアントエラー:', error);
});

// Discordクライアントの再接続ロジック
client.on('shardDisconnect', () => {
  logger.warn('Discord接続が切断されました。再接続を試みます...');
});

client.on('shardReconnecting', () => {
  logger.info('Discord接続を再確立しています...');
});

client.on('shardResume', () => {
  logger.info('Discord接続が再確立されました');
});

// サービスの初期化（あとで追加するサービスを初期化）
client.services = {};

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, (readyClient) => {
  logger.info(`Ready! Logged in as ${readyClient.user.tag}`);
  // サービスの開始 (必要に応じて追加)
});

// Handle interactions (slash commands)
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`コマンド ${interaction.commandName} が見つかりません`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`コマンド ${interaction.commandName} の実行中にエラーが発生しました:`, error);
    
    const errorMessage = 'コマンドの実行中にエラーが発生しました。';
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});

// Handle legacy text commands
client.on(Events.MessageCreate, async (message) => {
  // Ignore messages from bots or messages that don't start with the prefix
  if (message.author.bot || !message.content.startsWith(config.prefix)) return;

  // Parse command and arguments
  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();

  if (!commandName) return;

  // Handle legacy commands
  try {
    switch (commandName) {
      case 'moveall':
        await handleMoveAll(message, args);
        break;
      case 'movefrom':
        await handleMoveFrom(message, args);
        break;
      case 'moverole':
        await handleMoveRole(message, args);
        break;
      default:
        // Unknown command
        break;
    }
  } catch (error) {
    logger.error(`レガシーコマンド ${commandName} の実行中にエラーが発生しました:`, error);
    await message.reply('コマンドの実行中にエラーが発生しました。');
  }
});

// 終了時のクリーンアップ
process.on('SIGINT', () => {
  logger.info('アプリケーションを終了しています...');
  // サービスの停止 (必要に応じて追加)
  client.destroy();
  process.exit(0);
});

// コマンドをロード
loadCommands();

// Login to Discord with the client's token
client.login(config.token)
  .then(() => {
    logger.info('Botが正常にログインしました');
  })
  .catch((error) => {
    logger.error('ログインに失敗しました:', error);
  });
