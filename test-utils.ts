import { Client } from 'discord.js';
import { config } from './config/config';
import { logger } from './utils/logger';
import { setupVoiceStateMonitor } from './events/voiceStateMonitor';

// メインインデックスファイルを更新して、ボイスステート監視を有効化
export function updateMainIndex() {
  try {
    // index.tsファイルの内容を更新
    const indexContent = `import { Client, Events, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { config } from './config/config';
import { logger } from './utils/logger';
import fs from 'fs';
import path from 'path';
import { setupVoiceStateMonitor } from './events/voiceStateMonitor';

// レガシーコマンドハンドラー
import { handleMoveAll } from './legacy-commands/moveAll';
import { handleMoveFrom } from './legacy-commands/moveFrom';
import { handleMoveRole } from './legacy-commands/moveRole';

// Create a new client instance
const client = new Client(config.clientOptions);

// Command collection
client.commands = new Collection();

// Load commands
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
        logger.info(\`コマンド \${command.data.name} を読み込みました\`);
      } else {
        logger.warn(\`\${filePath} には必要な "data" または "execute" プロパティがありません\`);
      }
    }
  }
};

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, (readyClient) => {
  logger.info(\`Ready! Logged in as \${readyClient.user.tag}\`);
});

// Handle interactions (slash commands)
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    logger.warn(\`コマンド \${interaction.commandName} が見つかりません\`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(\`コマンド \${interaction.commandName} の実行中にエラーが発生しました:\`, error);
    
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
    logger.error(\`レガシーコマンド \${commandName} の実行中にエラーが発生しました:\`, error);
    await message.reply('コマンドの実行中にエラーが発生しました。');
  }
});

// ボイスステート監視を設定
setupVoiceStateMonitor(client);

// Load commands
loadCommands();

// Login to Discord with the client's token
client.login(config.token)
  .then(() => {
    logger.info('Botが正常にログインしました');
  })
  .catch((error) => {
    logger.error('ログインに失敗しました:', error);
  });

// Add TypeScript declaration for commands collection
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, any>;
  }
}`;

    return indexContent;
  } catch (error) {
    logger.error('メインインデックスファイルの更新中にエラーが発生しました:', error);
    throw error;
  }
}

// テスト用のモック関数
export function createTestClient(): Client {
  return new Client(config.clientOptions);
}

// テスト用のヘルパー関数
export function validateConfig(): boolean {
  if (!config.token) {
    logger.error('BOT_TOKENが設定されていません');
    return false;
  }
  
  if (!config.guildId) {
    logger.warn('GUILD_IDが設定されていません。開発中はギルド固有のコマンドが登録できません');
  }
  
  return true;
}

// テスト用のヘルパー関数
export function validateCommandStructure(): boolean {
  try {
    const commandsPath = path.join(__dirname, 'commands');
    const voiceCommandsPath = path.join(commandsPath, 'voice');
    
    if (!fs.existsSync(commandsPath)) {
      logger.error('commandsディレクトリが見つかりません');
      return false;
    }
    
    if (!fs.existsSync(voiceCommandsPath)) {
      logger.error('commands/voiceディレクトリが見つかりません');
      return false;
    }
    
    const commandFiles = fs.readdirSync(voiceCommandsPath).filter(file => file.endsWith('.ts'));
    if (commandFiles.length === 0) {
      logger.error('コマンドファイルが見つかりません');
      return false;
    }
    
    logger.info(`${commandFiles.length}個のコマンドファイルを検出しました`);
    return true;
  } catch (error) {
    logger.error('コマンド構造の検証中にエラーが発生しました:', error);
    return false;
  }
}
