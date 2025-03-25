import dotenv from 'dotenv';
import { GatewayIntentBits, Partials } from 'discord.js';

// Load environment variables
dotenv.config();

// Bot configuration
export const config = {
  // Bot token from environment variables
  token: process.env.BOT_TOKEN,
  
  // Guild ID for development/testing
  guildId: process.env.GUILD_ID,
  
  // Log channel ID for logging operations
  logChannelId: process.env.LOG_CHANNEL_ID,
  
  // Command prefix for legacy commands
  prefix: process.env.PREFIX || '!',
  
  // Client options
  clientOptions: {
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message],
  },
};

// Command definitions
export const commands = {
  moveAll: {
    name: 'moveall',
    description: 'すべてのボイスチャンネルからメンバーを指定のチャンネルに移動します',
  },
  moveFrom: {
    name: 'movefrom',
    description: '特定のボイスチャンネルからメンバーを別のチャンネルに移動します',
  },
  moveRole: {
    name: 'moverole',
    description: '特定のロールを持つメンバーを指定のボイスチャンネルに移動します',
  },
  moveByName: {
    name: 'movebyname',
    description: 'チャンネル名で指定したボイスチャンネルにメンバーを移動します',
  },
  undoLastMove: {
    name: 'undolastmove',
    description: '最後の移動操作を元に戻します',
  },
};
