import { Client, Events, Collection, GatewayIntentBits, Partials, Message } from 'discord.js';
import { config } from './config/config';
import { logger } from './utils/logger';
import fs from 'fs';
import path from 'path';

// クライアントにサービス用の型拡張
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, any>; // コマンドコレクションの型を追加
  }
}

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel, Partials.Message]
});

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

// グローバルな未処理エラーハンドラ
process.on('uncaughtException', (error) => {
  logger.error('未処理の例外が発生しました:', error);
});

process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('未処理のPromiseの拒否:', reason);
});

// Discordクライアントのエラーハンドリング
client.on('error', (error) => {
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

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, (readyClient) => {
  logger.info(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Handle interactions (slash commands)
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

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

  // 管理者権限のチェックを削除

  try {
    // コマンドファイルのパス
    const commandPath = path.join(__dirname, 'legacy-commands', `${commandName}.js`);
    
    // コマンドファイルが存在するかチェック
    if (!fs.existsSync(commandPath)) {
      return; // コマンドが見つからない場合は何もしない
    }
    
    // コマンドモジュールを読み込んで実行
    const command = require(commandPath);
    await command.execute(message, args);
  } catch (error) {
    logger.error(`レガシーコマンド ${commandName} の実行中にエラーが発生しました:`, error);
    message.reply('コマンドの実行中にエラーが発生しました。');
  }
});

// 終了時のクリーンアップ
process.on('SIGINT', () => {
  logger.info('アプリケーションを終了しています...');
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