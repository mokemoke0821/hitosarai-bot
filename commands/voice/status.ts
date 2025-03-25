import { SlashCommandBuilder, ChatInputCommandInteraction, Client } from 'discord.js';
import { logger } from '../../utils/logger';
import os from 'os';
import { config } from '../../config/config';

// 起動時間を記録
const startTime = Date.now();

// コマンド実行回数を記録するオブジェクト
const commandStats = {
  total: 0,
  counts: {} as Record<string, number>
};

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('ボットのステータス情報を表示します');

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    // ボットクライアントを取得
    const client = interaction.client as Client;
    
    // 統計情報を収集
    const uptime = Date.now() - startTime;
    const uptimeDays = Math.floor(uptime / (24 * 60 * 60 * 1000));
    const uptimeHours = Math.floor((uptime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const uptimeMinutes = Math.floor((uptime % (60 * 60 * 1000)) / (60 * 1000));
    const uptimeSeconds = Math.floor((uptime % (60 * 1000)) / 1000);
    
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.rss / 1024 / 1024);
    const systemMemoryMB = Math.round(os.totalmem() / 1024 / 1024);
    
    const serverCount = client.guilds.cache.size;
    const channelCount = client.channels.cache.size;
    
    // コマンド実行回数を更新
    commandStats.total++;
    const commandName = interaction.commandName;
    commandStats.counts[commandName] = (commandStats.counts[commandName] || 0) + 1;
    
    // 最も実行回数の多いコマンドを特定
    let mostUsedCommand = '';
    let mostUsedCount = 0;
    Object.entries(commandStats.counts).forEach(([cmd, count]) => {
      if (count > mostUsedCount) {
        mostUsedCommand = cmd;
        mostUsedCount = count;
      }
    });

    // 埋め込みメッセージを作成
    await interaction.reply({ 
      embeds: [{
        color: 0x0099ff,
        title: 'Discord Voice Mover Bot ステータス',
        description: 'ボットの稼働状況と統計情報',
        fields: [
          { name: '稼働時間', value: `${uptimeDays}日 ${uptimeHours}時間 ${uptimeMinutes}分 ${uptimeSeconds}秒`, inline: true },
          { name: 'メモリ使用量', value: `${memoryUsedMB}MB / ${systemMemoryMB}MB`, inline: true },
          { name: 'Node.jsバージョン', value: process.version, inline: true },
          { name: 'サーバー数', value: serverCount.toString(), inline: true },
          { name: 'チャンネル数', value: channelCount.toString(), inline: true },
          { name: 'コマンド実行回数', value: commandStats.total.toString(), inline: true },
          { name: '最も使用されているコマンド', value: mostUsedCommand ? `/${mostUsedCommand} (${mostUsedCount}回)` : 'なし', inline: false },
          { name: '開発者情報', value: 'Discord Voice Mover Bot', inline: false }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: `Bot ID: ${client.user?.id || '不明'}` }
      }]
    });
  } catch (error) {
    logger.error('status コマンドの実行中にエラーが発生しました:', error);
    await interaction.reply({ 
      content: '⚠️ コマンドの実行中にエラーが発生しました。ログを確認してください。',
      ephemeral: true 
    });
  }
}
